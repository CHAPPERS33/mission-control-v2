import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "Mission Control | AI Operations",
  description: "Real-time overview of the AI system — Mark Chapman",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen ml-16 lg:ml-56">
          <TopBar />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
