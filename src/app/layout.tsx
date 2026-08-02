import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Code Snippet Reviewer",
  description: "Submit code snippets for AI-powered review",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-foreground">
        <header className="sticky top-0 z-10 border-b border-border/80 bg-surface/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white shadow-sm"
              >
                {"</>"}
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                Code Snippet Reviewer
              </span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
