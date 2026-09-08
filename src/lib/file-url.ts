export function fileUrl(key?: string | null): string | undefined {
  if (!key) return undefined;
  return `/api/files/${key}`;
}
