import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kalaas",
  description: "Gérez votre institut, simplement.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" className={poppins.variable}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
