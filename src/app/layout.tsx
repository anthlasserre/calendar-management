import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestion des horaires du bureau",
  description:
    "Application de gestion des jours et horaires d'ouverture du bureau ainsi que des périodes de fermeture.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
