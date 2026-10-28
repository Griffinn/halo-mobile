import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export const metadata = { title: "Halo Mobile", description: "Phones built to last, with an assistant that knows them." };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body>
        <header>
          <Link href="/" className="logo">Halo</Link>
          <nav>
            <Link href="/assistant">Ask Halo</Link>
            {session ? <LogoutButton /> : <Link href="/login" className="btn">Sign in</Link>}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
