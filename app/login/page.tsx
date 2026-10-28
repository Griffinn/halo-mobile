"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    if (res.ok) { router.push("/assistant"); router.refresh(); }
    else setError((await res.json()).error);
  }

  return (
    <main className="narrow">
      <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit}>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        <p className="err" role="alert">{error}</p>
        <button className="btn" type="submit">{mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <p>
        {mode === "login" ? "New to Halo? " : "Already have an account? "}
        <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setMode(mode === "login" ? "register" : "login"); }}>
          {mode === "login" ? "Create an account" : "Sign in"}
        </a>
      </p>
    </main>
  );
}
