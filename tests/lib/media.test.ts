import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blobPathToPublicUrl,
  isMediaTypeValue,
  normalizeBlobPath,
} from "../../src/lib/media";

describe("media helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates media type values", () => {
    expect(isMediaTypeValue("IMAGE")).toBe(true);
    expect(isMediaTypeValue("VIDEO")).toBe(true);
    expect(isMediaTypeValue("GIF")).toBe(false);
  });

  it("normalizes leading slashes in blob path", () => {
    expect(normalizeBlobPath("///uploads/post.jpg")).toBe("uploads/post.jpg");
  });

  it("returns absolute URL unchanged", () => {
    const url = "https://cdn.example.com/a/b.jpg";
    expect(blobPathToPublicUrl(url)).toBe(url);
  });

  it("uses CDN base URL when configured", () => {
    vi.stubEnv("AZURE_CDN_BASE_URL", "https://cdn.example.com/");
    const result = blobPathToPublicUrl("/media/photo.png");
    expect(result).toBe("https://cdn.example.com/media/photo.png");
  });

  it("builds Azure blob URL when account name is set and key is missing", () => {
    vi.stubEnv("AZURE_STORAGE_ACCOUNT_NAME", "miniinstaacct");
    const result = blobPathToPublicUrl("container/image.jpg");
    expect(result).toBe(
      "https://miniinstaacct.blob.core.windows.net/container/image.jpg",
    );
  });

  it("throws when neither CDN base URL nor account name is configured", () => {
    expect(() => blobPathToPublicUrl("container/image.jpg")).toThrow(
      /Missing AZURE_STORAGE_ACCOUNT_NAME/,
    );
  });
});
