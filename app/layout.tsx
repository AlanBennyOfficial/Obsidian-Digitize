import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// ── Fonts ──────────────────────────────────────────────────────────────────
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// ── SEO Metadata ───────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Obsidian Digitize",
  description:
    "Convert handwritten notes and scanned documents to editable Markdown, Word (.docx), and PDF instantly using state-of-the-art AI models including Gemini, GPT-4o, and local LLMs. Build by Aryan Dhuri and Alan Benny",
  keywords: ["OCR", "handwriting recognition", "AI transcription", "digitize notes", "handwritten to text"],
  openGraph: {
    title: "Obsidian Digitize",
    description: "Instantly transcribe handwritten notes with AI",
    type: "website",
  },
};

// ── Root Layout ────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body
        className="min-h-full flex flex-col antialiased"
        style={{ backgroundColor: "var(--bg-void)" }}
      >
        {children}
      </body>
    </html>
  );
}
