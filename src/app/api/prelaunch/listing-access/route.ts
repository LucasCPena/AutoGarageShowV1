import { NextRequest, NextResponse } from "next/server";

import {
  PUBLIC_LISTING_ACCESS_MAX_AGE,
  PUBLIC_LISTING_ACCESS_VALUE,
  PUBLIC_LISTING_FORM_PATH,
  PUBLIC_LISTING_PAGE_ACCESS_COOKIE
} from "@/lib/public-listing-access";
import { resolvePublicOrigin } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const redirectUrl = new URL(PUBLIC_LISTING_FORM_PATH, resolvePublicOrigin(request.url));
  const response = NextResponse.redirect(redirectUrl);
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: PUBLIC_LISTING_PAGE_ACCESS_COOKIE,
    value: PUBLIC_LISTING_ACCESS_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: PUBLIC_LISTING_ACCESS_MAX_AGE
  });

  return response;
}
