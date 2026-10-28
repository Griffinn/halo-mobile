import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and a password of 8+ characters." }, { status: 400 });
  const { email, password } = parsed.data;
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      [email.toLowerCase(), hash]
    );
    await createSession(rows[0].id, email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }
}
