export const RASTER_IMAGE_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
] as const;

export type RasterImageMime = (typeof RASTER_IMAGE_MIME_TYPES)[number];

function startsWith(data: Uint8Array, signature: readonly number[], offset = 0) {
  return data.length >= offset + signature.length &&
    signature.every((byte, index) => data[offset + index] === byte);
}

/** Identify supported raster formats by bytes; never trust filenames or declared MIME types. */
export function detectRasterImageMime(data: Uint8Array): RasterImageMime | null {
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(data, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      startsWith(data, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return "image/gif";
  if (startsWith(data, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(data, [0x57, 0x45, 0x42, 0x50], 8) &&
      (startsWith(data, [0x56, 0x50, 0x38, 0x20], 12) ||
       startsWith(data, [0x56, 0x50, 0x38, 0x4c], 12) ||
       startsWith(data, [0x56, 0x50, 0x38, 0x58], 12))) return "image/webp";
  return null;
}
