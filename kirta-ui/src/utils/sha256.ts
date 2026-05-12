export function truncateSha(value: string, length = 8): string {
  if (!value) return "";
  if (value.length <= length) return value;
  return value.slice(0, length);
}
