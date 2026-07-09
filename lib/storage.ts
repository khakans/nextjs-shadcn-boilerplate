import "server-only";

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const storageRoot = path.join(process.cwd(), "storage");
export const publicStorageRoot = path.join(storageRoot, "public");

type StorageDriver = "local" | "minio" | "s3";

type S3StorageConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  region: string;
  secretAccessKey: string;
};

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const mimeTypeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

let s3Client: S3Client | null = null;

export async function savePublicFile(input: {
  buffer: Buffer;
  contentType: string;
  directory?: string;
}) {
  const extension = extensionByMimeType[input.contentType];

  if (!extension) {
    throw new Error(`Unsupported public storage content type: ${input.contentType}`);
  }

  const safeDirectory = normalizeStorageDirectory(input.directory);
  const fileName = `${randomUUID()}.${extension}`;
  const key = safeDirectory ? `${safeDirectory}/${fileName}` : fileName;

  if (getStorageDriver() === "local") {
    const absoluteDirectory = path.join(publicStorageRoot, safeDirectory);

    await mkdir(absoluteDirectory, {
      recursive: true,
    });
    await writeFile(path.join(absoluteDirectory, fileName), input.buffer);
  } else {
    const { bucket } = getS3StorageConfig();

    await putS3Object({
      body: input.buffer,
      bucket,
      contentType: input.contentType,
      key,
    });
  }

  return `/${key}`;
}

export async function deletePublicFile(publicUrl: string | null | undefined) {
  const relativePath = getPublicStorageRelativePath(publicUrl);

  if (!relativePath) {
    return;
  }

  if (getStorageDriver() !== "local") {
    const { bucket } = getS3StorageConfig();

    await getS3Client()
      .send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: relativePath,
        }),
      )
      .catch(ignoreMissingObjectError);
    return;
  }

  const absolutePath = resolvePublicStoragePath(relativePath);

  if (!absolutePath) {
    return;
  }

  await unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });
}

export async function readPublicFile(relativePath: string) {
  const normalizedRelativePath = normalizePublicStorageKey(relativePath);

  if (!normalizedRelativePath) {
    return null;
  }

  if (getStorageDriver() !== "local") {
    const { bucket } = getS3StorageConfig();
    const object = await getS3Client()
      .send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: normalizedRelativePath,
        }),
      )
      .catch((error) => {
        if (isMissingObjectError(error)) {
          return null;
        }

        throw error;
      });

    if (!object?.Body) {
      return null;
    }

    return {
      buffer: Buffer.from(await object.Body.transformToByteArray()),
      contentType:
        object.ContentType ??
        getMimeTypeFromExtension(normalizedRelativePath),
    };
  }

  const absolutePath = resolvePublicStoragePath(normalizedRelativePath);

  if (!absolutePath) {
    return null;
  }

  const fileStat = await stat(absolutePath).catch(() => null);

  if (!fileStat?.isFile()) {
    return null;
  }

  const buffer = await readFile(absolutePath);
  const extension = path.extname(absolutePath).slice(1).toLowerCase();

  return {
    buffer,
    contentType: mimeTypeByExtension[extension] ?? getMimeTypeFromExtension(absolutePath),
  };
}

export function parseImageDataUrl(value: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/]+=*)$/i.exec(
    value,
  );

  if (!match) {
    return null;
  }

  return {
    buffer: Buffer.from(match[2], "base64"),
    contentType: match[1].toLowerCase(),
  };
}

function getPublicStorageRelativePath(publicUrl: string | null | undefined) {
  if (publicUrl?.startsWith("/public/")) {
    return publicUrl.slice("/public/".length);
  }

  if (publicUrl?.startsWith("/storage/")) {
    return publicUrl.slice("/storage/".length);
  }

  if (publicUrl?.startsWith("/") && !publicUrl.startsWith("//")) {
    return publicUrl.slice(1);
  }

  return null;
}

function resolvePublicStoragePath(relativePath: string) {
  const normalizedRelativePath = normalizePublicStorageKey(relativePath);

  if (!normalizedRelativePath) {
    return null;
  }

  const absolutePath = path.resolve(publicStorageRoot, normalizedRelativePath);
  const publicRoot = path.resolve(publicStorageRoot);

  return absolutePath.startsWith(`${publicRoot}${path.sep}`)
    ? absolutePath
    : null;
}

function normalizePublicStorageKey(relativePath: string) {
  const normalizedRelativePath = relativePath.replaceAll("\\", "/");

  if (
    normalizedRelativePath.includes("..") ||
    path.isAbsolute(normalizedRelativePath) ||
    normalizedRelativePath.startsWith("/")
  ) {
    return null;
  }

  return normalizedRelativePath
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function normalizeStorageDirectory(directory = "") {
  return directory
    .split(/[\\/]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => /^[a-z0-9_-]+$/.test(part))
    .join("/");
}

function getMimeTypeFromExtension(filePath: string) {
  const extension = path.extname(filePath).slice(1).toLowerCase();

  return mimeTypeByExtension[extension] ?? "application/octet-stream";
}

function getStorageDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER?.trim().toLowerCase();

  if (!driver || driver === "local") {
    return "local";
  }

  if (driver === "minio") {
    return "minio";
  }

  if (driver === "s3") {
    return "s3";
  }

  throw new Error(
    "Invalid STORAGE_DRIVER. Expected one of: local, minio, s3.",
  );
}

function getS3StorageConfig(): S3StorageConfig {
  const driver = getStorageDriver();

  if (driver === "local") {
    throw new Error("S3 storage config is not available for local storage.");
  }

  if (driver === "minio") {
    return {
      accessKeyId: requireEnv("MINIO_ACCESS_KEY"),
      bucket: requireEnv("MINIO_BUCKET"),
      endpoint: requireEnv("MINIO_ENDPOINT"),
      forcePathStyle: parseBooleanEnv(process.env.MINIO_FORCE_PATH_STYLE, true),
      region: process.env.MINIO_REGION?.trim() || "us-east-1",
      secretAccessKey: requireEnv("MINIO_SECRET_KEY"),
    };
  }

  return {
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    bucket: requireEnv("S3_BUCKET"),
    endpoint: normalizeOptionalEnv(process.env.S3_ENDPOINT),
    forcePathStyle: parseBooleanEnv(process.env.S3_FORCE_PATH_STYLE, false),
    region: requireEnv("S3_REGION"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  };
}

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  const config = getS3StorageConfig();

  s3Client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  });

  return s3Client;
}

async function putS3Object({
  body,
  bucket,
  contentType,
  key,
}: {
  body: Buffer;
  bucket: string;
  contentType: string;
  key: string;
}) {
  try {
    await getS3Client().send(
      new PutObjectCommand({
        Body: body,
        Bucket: bucket,
        ContentType: contentType,
        Key: key,
      }),
    );
  } catch (error) {
    if (getStorageDriver() !== "minio" || !isMissingBucketError(error)) {
      throw error;
    }

    await getS3Client().send(
      new CreateBucketCommand({
        Bucket: bucket,
      }),
    );
    await getS3Client().send(
      new PutObjectCommand({
        Body: body,
        Bucket: bucket,
        ContentType: contentType,
        Key: key,
      }),
    );
  }
}

function requireEnv(key: string) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required for ${getStorageDriver()} storage.`);
  }

  return value;
}

function normalizeOptionalEnv(value: string | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue || undefined;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

function ignoreMissingObjectError(error: unknown) {
  if (isMissingObjectError(error)) {
    return;
  }

  throw error;
}

function isMissingObjectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  const httpStatusCode =
    "$metadata" in error &&
    error.$metadata &&
    typeof error.$metadata === "object" &&
    "httpStatusCode" in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : null;

  return name === "NoSuchKey" || name === "NotFound" || httpStatusCode === 404;
}

function isMissingBucketError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  const httpStatusCode =
    "$metadata" in error &&
    error.$metadata &&
    typeof error.$metadata === "object" &&
    "httpStatusCode" in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : null;

  return name === "NoSuchBucket" || httpStatusCode === 404;
}
