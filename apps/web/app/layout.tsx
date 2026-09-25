import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLARE — Football Live Analytics & Real-time Experience",
  description: "The football-native platform for players, teams and clubs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          <main className="mx-auto max-w-5xl px-md pb-xxxl pt-lg">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
