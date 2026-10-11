import { getAuthenticatedSession } from "@/lib/auth/session";
import { getAttachmentFile } from "@/features/attachments/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();
  if (!session?.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const file = await getAttachmentFile(session.userId, id);
  if (!file || !file.data) {
    return new Response("Not found", { status: 404 });
  }

  const data = new Uint8Array(file.data);
  const mimeType = file.mimeType ?? "application/octet-stream";
  const disposition = mimeType.startsWith("image/") ? "inline" : "attachment";

  return new Response(data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Content-Length": String(data.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
