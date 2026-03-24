import {
  BlobSASPermissions,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

declare global {
  // eslint-disable-next-line no-var
  var signedBlobUrlCache:
    | Map<
        string,
        {
          url: string;
          expiresAt: number;
        }
      >
    | undefined;
}

const MEDIA_TYPE_VALUES = ["IMAGE", "VIDEO"] as const;

export type MediaTypeValue = (typeof MEDIA_TYPE_VALUES)[number];

export function isMediaTypeValue(value: string): value is MediaTypeValue {
  return MEDIA_TYPE_VALUES.includes(value as MediaTypeValue);
}

export function normalizeBlobPath(blobPath: string): string {
  return blobPath.replace(/^\/+/, "");
}

export function blobPathToPublicUrl(blobPath: string): string {
  if (/^https?:\/\//i.test(blobPath)) {
    return blobPath;
  }

  const normalized = normalizeBlobPath(blobPath);
  const cdnBaseUrl = process.env.AZURE_CDN_BASE_URL;
  if (cdnBaseUrl) {
    return `${cdnBaseUrl.replace(/\/+$/, "")}/${normalized}`;
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) {
    throw new Error("Missing AZURE_STORAGE_ACCOUNT_NAME for media URL mapping.");
  }

  const baseUrl = `https://${accountName}.blob.core.windows.net/${normalized}`;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  if (!accountKey) {
    return baseUrl;
  }

  const firstSlash = normalized.indexOf("/");
  if (firstSlash <= 0 || firstSlash === normalized.length - 1) {
    return baseUrl;
  }

  const containerName = normalized.slice(0, firstSlash);
  const blobName = normalized.slice(firstSlash + 1);
  const cacheKey = `${accountName}/${containerName}/${blobName}`;
  const now = Date.now();
  const cached = global.signedBlobUrlCache?.get(cacheKey);
  if (cached && cached.expiresAt - now > 5 * 60 * 1000) {
    return cached.url;
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const startsOn = new Date(now - 60 * 1000);
  const expiresOn = new Date(now + 60 * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
    },
    credential
  ).toString();

  const signedUrl = `${baseUrl}?${sas}`;
  if (!global.signedBlobUrlCache) {
    global.signedBlobUrlCache = new Map();
  }
  global.signedBlobUrlCache.set(cacheKey, { url: signedUrl, expiresAt: expiresOn.getTime() });
  return signedUrl;
}
