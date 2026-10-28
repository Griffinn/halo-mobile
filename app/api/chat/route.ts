import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { answer } from "@/lib/rag";

export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Sign in to use the assistant." }, { status: 401 });
  const { question } = await req.json();
  if (typeof question !== "string" || !question.trim() || question.length > 500)
    return NextResponse.json({ error: "Ask a question of up to 500 characters." }, { status: 400 });
  try {
    return NextResponse.json(await answer(question.trim()));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "The assistant is unavailable. Try again shortly." }, { status: 500 });
  }
}
