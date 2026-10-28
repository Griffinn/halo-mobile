import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const { rows } = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [String(email).toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(String(password), user.password_hash)))
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  await createSession(user.id, email);
  return NextResponse.json({ ok: true });
}
