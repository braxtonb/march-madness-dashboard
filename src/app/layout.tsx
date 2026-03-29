import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchDashboardData } from "@/lib/sheets";
import CompareProvider from "@/components/ui/CompareProvider";
import CompareBar from "@/components/ui/CompareBar";
import MyBracketProvider from "@/components/ui/MyBracketProvider";
import { LiveTicker } from "@/components/layout/LiveTicker";
import { BottomNav } from "@/components/layout/BottomNav";
import { MaintenanceFallback } from "@/components/ui/MaintenanceFallback";

export const metadata: Metadata = {
  title: "DoorDash AP 2026 Bracket Lab",
  description: "March Madness bracket analytics for a 75-person pool. Live standings, group picks, win probability, head-to-head comparisons, and scenario simulator.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "DoorDash AP 2026 Bracket Lab",
    description: "March Madness bracket analytics for a 75-person pool. Live standings, group picks, win probability, and more.",
    siteName: "Bracket Lab",
    type: "website",
    url: "https://march-madness-dashboard-six.vercel.app",
    images: [{ url: "/og-image.jpeg", width: 1200, height: 630, alt: "Bracket Lab — March Madness Analytics" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DoorDash AP 2026 Bracket Lab",
    description: "March Madness bracket analytics for a 75-person pool.",
    images: ["/og-image.jpeg"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let meta = null;
  let brackets: import("@/lib/types").Bracket[] = [];
  let games: import("@/lib/types").Game[] = [];
  let hasData = false;
  try {
    const data = await fetchDashboardData();
    meta = data.meta;
    brackets = data.brackets;
    games = data.games;
    hasData = brackets.length > 0;
  } catch {
    // Layout still renders without data — fallback UI handles it
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
        <MyBracketProvider>
        <CompareProvider>
          <Navbar meta={meta} brackets={brackets} />
          <LiveTicker games={games} />
          <div className="flex">
            <Sidebar />
            <main className="ml-0 md:ml-16 w-full min-h-[calc(100vh-52px)] px-4 py-4 sm:p-6 pb-20 md:pb-6">
              <div className="max-w-7xl mx-auto">
                {hasData ? children : <MaintenanceFallback />}
              </div>
            </main>
          </div>
          <CompareBar brackets={brackets} />
          <BottomNav />
        </CompareProvider>
        </MyBracketProvider>
      </body>
    </html>
  );
}
