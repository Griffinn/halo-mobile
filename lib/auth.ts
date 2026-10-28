import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!);
export const COOKIE = "halo_session";

export async function createSession(userId: number, email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setExpirationTime("7d")
    .sign(secret());
  cookies().set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: Number(payload.sub), email: payload.email as string };
  } catch {
    return null;
  }
}
