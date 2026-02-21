import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Insight Compass",
  description: "Track and monitor competitors with strategic precision",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`min-h-screen ${inter.className} ${inter.variable}`}>
        <script dangerouslySetInnerHTML={{
          __html: `
          console.log('[DEBUG-CLIENT] URL:', window.location.pathname);
          if (window.location.pathname === '/dashboard/settings') {
            console.log('[DEBUG-CLIENT] Entering settings page...');
          }
          const originalPush = window.history.pushState;
          window.history.pushState = function(...args) {
            console.log('[DEBUG-CLIENT] history.pushState called:', args[2]);
            return originalPush.apply(this, args);
          };
          window.addEventListener('popstate', () => {
            console.log('[DEBUG-CLIENT] popstate detected:', window.location.pathname);
          });
        `}} />
        {children}
      </body>
    </html>
  );
}
