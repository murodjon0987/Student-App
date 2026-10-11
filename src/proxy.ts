import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/token";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

async function isAuthenticated(token: string | undefined) {
  return Boolean(await decrypt(token));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;
  const authed = await isAuthenticated(token);

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (pathname === "/") {
    // The page verifies the database session before redirecting signed-in users.
    return NextResponse.next();
  }

  if (!authed && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/dashboard") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Public auth pages must remain reachable with revoked/deleted-account cookies.
  // The signature alone cannot tell whether a session was revoked in the database.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|offline.html|icons|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)",
  ],
};
