import { detectRasterImageMime } from "@/lib/image";

export const MAX_ATTACHMENT_BYTES = 8_000_000;
export const MAX_ATTACHMENTS_PER_ITEM = 20;

export const PDF_MIME = "application/pdf";
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const ATTACHMENT_MIME_TYPES = [
  PDF_MIME,
  DOCX_MIME,
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type AttachmentMimeType = (typeof ATTACHMENT_MIME_TYPES)[number];

function startsWith(data: Uint8Array, signature: readonly number[], offset = 0) {
  return (
    data.length >= offset + signature.length &&
    signature.every((byte, index) => data[offset + index] === byte)
  );
}

// DOCX (and OOXML) files are ZIP archives whose entries include "word/..." and
// "[Content_Types].xml". Reading entry names needs no decompression.
function containsAscii(data: Uint8Array, text: string, limit = 262_144) {
  const needle = new TextEncoder().encode(text);
  const end = Math.min(data.length - needle.length, limit);
  for (let i = 0; i <= end; i += 1) {
    let match = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (data[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/** Identify an allowed attachment type from its bytes; never trust the file name. */
export function detectAttachmentMime(
  data: Uint8Array
): AttachmentMimeType | null {
  const image = detectRasterImageMime(data);
  if (image) return image;
  if (startsWith(data, [0x25, 0x50, 0x44, 0x46, 0x2d])) return PDF_MIME;
  if (
    startsWith(data, [0x50, 0x4b, 0x03, 0x04]) &&
    (containsAscii(data, "word/") || containsAscii(data, "[Content_Types].xml"))
  ) {
    return DOCX_MIME;
  }
  return null;
}

export function attachmentKindLabel(mime: string): string {
  if (mime === PDF_MIME) return "PDF";
  if (mime === DOCX_MIME) return "DOCX";
  if (mime.startsWith("image/")) return "Rasm";
  return "Fayl";
}

// Strip path separators and control characters that could break headers.
export function sanitizeFileName(name: string): string {
  const base = (name || "fayl")
    .replace(/[\\/\r\n\t\0]/g, "_")
    .replace(/^\.+/, "")
    .trim();
  return (base || "fayl").slice(0, 180);
}
