import { prisma } from "@/lib/prisma";
import { decrypt, getSessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await decrypt(await getSessionToken());
  if (!session?.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const image = await prisma.generatedImage.findFirst({
    where: { id, userId: session.userId },
    select: { data: true, mimeType: true },
  });

  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
