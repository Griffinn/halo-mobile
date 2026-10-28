import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("halo_session")?.value;
  try {
    if (!token) throw new Error();
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
export const config = { matcher: ["/assistant/:path*"] };
