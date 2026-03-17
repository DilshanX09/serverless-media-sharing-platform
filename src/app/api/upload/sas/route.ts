import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createUploadSasUrl } from "@/lib/azure";
import { blobPathToPublicUrl, isMediaTypeValue, normalizeBlobPath } from "@/lib/media";
import { requireAuth } from "@/lib/routeAuth";

interface UploadSasBody {
  fileName?: unknown;
  mediaType?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = requireAuth(request);
  if ("response" in authResult) {
    return authResult.response;
  }

  const body = (await request.json().catch(() => null)) as UploadSasBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const mediaType = typeof body.mediaType === "string" ? body.mediaType.trim().toUpperCase() : "";
  if (!fileName) {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }
  if (!isMediaTypeValue(mediaType)) {
    return NextResponse.json({ error: "mediaType must be IMAGE or VIDEO" }, { status: 400 });
  }

  const safeFileName = fileName.replace(/[^\w.\-]/g, "_");
  const extension = safeFileName.includes(".") ? safeFileName.split(".").pop() : "";
  const datePrefix = new Date().toISOString().slice(0, 10);
  const blobName = `${authResult.user.sub}/${mediaType.toLowerCase()}/${datePrefix}/${randomUUID()}${extension ? `.${extension}` : ""}`;
  const sasResult = createUploadSasUrl(blobName);
  const blobUrl = normalizeBlobPath(sasResult.blobPath);

  return NextResponse.json(
    {
      uploadUrl: sasResult.uploadUrl,
      blobUrl,
      publicUrl: blobPathToPublicUrl(blobUrl),
      expiresInSeconds: sasResult.expiresInSeconds,
    },
    { status: 200 }
  );
}
