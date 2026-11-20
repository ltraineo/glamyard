import "./globals.css";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { getUser } from "@/lib/auth";

export const metadata = {
  title: APP_NAME,
  description: "Invite only.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en">
      <body>
        {user && (
          <header className="top">
            <Link href="/events" className="brand">
              {APP_NAME}
            </Link>
            <nav>
              <Link href="/events">Events</Link>
              <Link href="/invites">Invites</Link>
              <Link href={`/people/${user.id}`}>Me</Link>
              {user.is_admin && <Link href="/admin">Admin</Link>}
              <form method="post" action="/api/signout">
                <button className="link" type="submit">
                  Sign out
                </button>
              </form>
            </nav>
          </header>
        )}
        <main className={user ? "wrap" : "wrap wrap-center"}>{children}</main>
      </body>
    </html>
  );
}
