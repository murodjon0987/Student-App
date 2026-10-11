import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { detectRasterImageMime } from "@/lib/image";

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

  const image = await prisma.housingImage.findUnique({
    where: { id },
    select: { data: true },
  });

  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  const data = new Uint8Array(image.data);
  const mimeType = detectRasterImageMime(data);
  if (!mimeType) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(data, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
