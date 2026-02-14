import { NextResponse } from "next/server";

export function GET(request: Request) {
  const iconUrl = new URL("/placeholders/car.svg", request.url);
  return NextResponse.redirect(iconUrl, 307);
}
