
import { randomUUID } from "node:crypto";
import { Client, Permission, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  bucketId: string;
  storage: Storage;
}

interface UploadedCommunityImage {
  fileId: string;
  url: string;
}

function getAppwriteConfig(): AppwriteConfig {
  const endpoint = process.env.APPWRITE_ENDPOINT?.trim();
  const projectId = process.env.APPWRITE_PROJECT_ID?.trim();
  const apiKey = process.env.APPWRITE_API_KEY?.trim();
  const bucketId = process.env.APPWRITE_BUCKET_ID?.trim();

  if (!endpoint || !projectId || !apiKey || !bucketId) {
    throw new Error(
      "Appwrite Storage is not configured. Check the required environment variables.",
    );
  }

  let parsedEndpoint: URL;

  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new Error("APPWRITE_ENDPOINT is not a valid URL.");
  }

  if (
    !["http:", "https:"].includes(parsedEndpoint.protocol) ||
    (process.env.NODE_ENV === "production" && parsedEndpoint.protocol !== "https:") ||
    parsedEndpoint.username ||
    parsedEndpoint.password ||
    parsedEndpoint.search ||
    parsedEndpoint.hash
  ) {
    throw new Error("APPWRITE_ENDPOINT is invalid.");
  }

  const client = new Client()
    .setEndpoint(endpoint.replace(/\/+$/, ""))
    .setProject(projectId)
    .setKey(apiKey);

  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    projectId,
    bucketId,
    storage: new Storage(client),
  };
}

function getImageExtension(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Unsupported image type.");
  }
}

export async function uploadCommunityReportImage(
  buffer: Buffer,
  contentType: string,
): Promise<UploadedCommunityImage> {
  if (!buffer.length) {
    throw new Error("Cannot upload an empty image.");
  }

  const config = getAppwriteConfig();
  const fileId = randomUUID();
  const extension = getImageExtension(contentType);
  const fileName = `community-report-${fileId}.${extension}`;

  await config.storage.createFile({
    bucketId: config.bucketId,
    fileId,
    file: InputFile.fromBuffer(buffer, fileName),
    permissions: [Permission.read(Role.any())],
  });

  const imageUrl =
    `${config.endpoint}/storage/buckets/` +
    `${encodeURIComponent(config.bucketId)}/files/` +
    `${encodeURIComponent(fileId)}/view?project=` +
    encodeURIComponent(config.projectId);

  return {
    fileId,
    url: imageUrl,
  };
}

export async function deleteCommunityReportImage(
  fileId: string,
): Promise<void> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(fileId)) {
    throw new Error("Invalid Appwrite file ID.");
  }

  const config = getAppwriteConfig();

  await config.storage.deleteFile({
    bucketId: config.bucketId,
    fileId,
  });
}

export function getCommunityReportImageFileId(
  imageUrl: string,
): string | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return null;
  }

  const config = getAppwriteConfig();
  const endpointUrl = new URL(config.endpoint);

  if (
    parsedUrl.origin !== endpointUrl.origin ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.hash ||
    parsedUrl.searchParams.get("project") !== config.projectId
  ) {
    return null;
  }

  const endpointPath = endpointUrl.pathname.replace(/\/+$/, "");
  const expectedPrefix =
    `${endpointPath}/storage/buckets/${encodeURIComponent(config.bucketId)}/files/`;

  if (!parsedUrl.pathname.startsWith(expectedPrefix)) {
    return null;
  }

  const encodedFileId = parsedUrl.pathname.slice(expectedPrefix.length);

  if (!encodedFileId.endsWith("/view")) {
    return null;
  }

  const encodedId = encodedFileId.slice(0, -"/view".length);

  let fileId: string;

  try {
    fileId = decodeURIComponent(encodedId);
  } catch {
    return null;
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(fileId)) {
    return null;
  }

  return fileId;
}
