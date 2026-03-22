import { NextRequest, NextResponse } from "next/server";

import {
  PUBLIC_LISTING_ACCESS_ROUTE,
  PUBLIC_LISTING_FORM_PATH,
  PUBLIC_LISTING_PAGE_ACCESS_COOKIE
} from "@/lib/public-listing-access";

const AUTH_COOKIE_NAME = "ags_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPublicListingAccess = Boolean(
    request.cookies.get(PUBLIC_LISTING_PAGE_ACCESS_COOKIE)?.value
  );

  if (!hasPublicListingAccess) {
    return NextResponse.next();
  }

  if (
    pathname === PUBLIC_LISTING_FORM_PATH ||
    pathname === PUBLIC_LISTING_ACCESS_ROUTE
  ) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = PUBLIC_LISTING_FORM_PATH;
  redirectUrl.search = "";

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|uploads).*)"
  ]
};
