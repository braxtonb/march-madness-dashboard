import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchDashboardData } from "@/lib/sheets";

export const metadata: Metadata = {
  title: "DoorDash AP 2026 Bracket Lab",
  description: "March Madness bracket analytics dashboard",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let meta = null;
  try {
    const data = await fetchDashboardData();
    meta = data.meta;
  } catch {
    // Layout still renders without data — pages handle their own errors
  }

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface font-body antialiased">
        <Navbar meta={meta} />
        <div className="flex">
          <Sidebar />
          <main className="ml-0 md:ml-56 w-full min-h-[calc(100vh-52px)] p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
