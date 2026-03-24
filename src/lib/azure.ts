import {
  BlobSASPermissions,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAzureContainerName(): string {
  return process.env.AZURE_STORAGE_CONTAINER_NAME ?? "media";
}

export interface UploadSasResult {
  blobName: string;
  blobPath: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export function createUploadSasUrl(blobName: string): UploadSasResult {
  const accountName = requireEnv("AZURE_STORAGE_ACCOUNT_NAME");
  const accountKey = requireEnv("AZURE_STORAGE_ACCOUNT_KEY");
  const containerName = getAzureContainerName();

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const expiresInSeconds = 10 * 60;
  const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      // Browser PUT uploads can require write/create and property reads.
      permissions: BlobSASPermissions.parse("racw"),
      startsOn: new Date(Date.now() - 60 * 1000),
      expiresOn,
      protocol: SASProtocol.Https,
      contentDisposition: "inline",
    },
    sharedKeyCredential
  ).toString();

  const encodedBlobName = blobName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodedBlobName}?${sas}`;

  return {
    blobName,
    blobPath: `${containerName}/${blobName}`,
    uploadUrl,
    expiresInSeconds,
  };
}
