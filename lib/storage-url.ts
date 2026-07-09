export function getStorageFileUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const storageUrl = (process.env.STORAGE_URL ?? "").replace(/\/+$/, "");
  const filePath = value.startsWith("/") ? value : `/${value}`;

  return storageUrl ? `${storageUrl}${filePath}` : filePath;
}
