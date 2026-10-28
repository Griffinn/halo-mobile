"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button className="btn" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }}>
      Sign out
    </button>
  );
}
