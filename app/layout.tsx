import "./globals.css";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { getUser } from "@/lib/auth";
import { incomingCount } from "@/lib/friends";

export const metadata = {
  title: APP_NAME,
  description: "Invite only.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const requests = user ? await incomingCount(user.id) : 0;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Mono:wght@400;700&display=swap"
        />
        {!user && <meta name="theme-color" content="#0B0B0F" />}
      </head>
      <body className={user ? undefined : "night"}>
        {user && (
          <header className="top">
            <Link href="/events" className="brand">
              {APP_NAME}
            </Link>
            <nav>
              <Link href="/events">Events</Link>
              <Link href="/friends">
                Friends{requests > 0 && <span className="badge" aria-label={`${requests} new ${requests === 1 ? "request" : "requests"}`}>{requests}</span>}
              </Link>
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
