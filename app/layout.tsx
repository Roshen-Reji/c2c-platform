import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C2C — Campus 2 Corporate | Transform Your Career",
  description:
    "A multi-session online training program preparing B.Tech students for the corporate world through 5 comprehensive phases of learning, tasks, and assessments.",
  keywords: [
    "campus to corporate",
    "B.Tech training",
    "placement preparation",
    "technical skills",
    "soft skills",
    "resume building",
    "mock interviews",
  ],
  openGraph: {
    title: "C2C — Campus 2 Corporate",
    description:
      "Transform from a student to a corporate-ready professional in 5 phases.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
