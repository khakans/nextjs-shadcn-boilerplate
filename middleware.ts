import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicStorageFilePattern = /\.(?:jpe?g|png|webp)$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/storage/") ||
    pathname.startsWith("/_next/") ||
    !publicStorageFilePattern.test(pathname)
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/storage${pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
