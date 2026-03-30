/**
 * ExportBar component
 *
 * Displays three export actions:
 *   1. Copy Text   — uses Clipboard API
 *   2. Download .docx — uses the `docx` package
 *   3. Download .pdf  — uses `jspdf`
 */

"use client";

import { useState } from "react";
import { Copy, Check, FileDown, File } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { jsPDF } from "jspdf";

// ── Types ──────────────────────────────────────────────────────────────────
interface ExportBarProps {
  text: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Very lightweight Markdown → docx paragraphs converter.
 * Handles headings (H1–H3), bullet lists, and plain paragraphs.
 */
function markdownToDocxParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // H1  → Heading 1
    if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 100 },
        })
      );
    }
    // H2  → Heading 2
    else if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.slice(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
        })
      );
    }
    // H3  → Heading 3
    else if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.slice(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 60 },
        })
      );
    }
    // Bullet list
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.slice(2),
          bullet: { level: 0 },
          spacing: { after: 40 },
        })
      );
    }
    // Empty line → spacer paragraph
    else if (trimmed === "") {
      paragraphs.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    }
    // Regular paragraph
    else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, size: 24 })],
          spacing: { after: 120 },
        })
      );
    }
  }

  return paragraphs;
}

/** Trigger a browser download for a given blob */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sub-component: individual export button ────────────────────────────────
interface ExportBtnProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  accentColor?: string;
}

function ExportBtn({ id, label, icon, onClick, active, accentColor = "var(--accent-cyan)" }: ExportBtnProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      id={id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.625rem 1.25rem",
        background: hovered
          ? `rgba(${accentColor === "var(--accent-violet)" ? "167,139,250" : "0,245,228"}, 0.1)`
          : "var(--bg-elevated)",
        border: `1px solid ${hovered ? accentColor : "var(--border-dim)"}`,
        borderRadius: "var(--radius)",
        color: hovered ? accentColor : "var(--text-secondary)",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.18s",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap" as const,
        filter: hovered ? `drop-shadow(0 0 6px ${accentColor})` : "none",
      }}
    >
      {active ? <Check size={15} color="var(--accent-cyan)" /> : icon}
      {label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function ExportBar({ text }: ExportBarProps) {
  const [copied, setCopied] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // ── Copy to clipboard ────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without Clipboard API
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Download .docx ───────────────────────────────────────────────────
  const handleDocx = async () => {
    setExportingDocx(true);
    try {
      const doc = new Document({
        creator: "Obsidian Digitize",
        title: "Transcribed Notes",
        description: "Generated by Obsidian Digitize AI transcription tool",
        sections: [
          {
            children: markdownToDocxParagraphs(text),
          },
        ],
      });
      const buffer = await Packer.toBlob(doc);
      downloadBlob(buffer, "obsidian-transcription.docx");
    } catch (err) {
      console.error("DOCX export failed:", err);
    } finally {
      setExportingDocx(false);
    }
  };

  // ── Download .pdf ────────────────────────────────────────────────────
  const handlePdf = () => {
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      // Page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 18;
      const maxLineWidth = pageWidth - margin * 2;
      let y = margin;

      // Helper: add a new page if needed
      const checkPage = (needed: number) => {
        if (y + needed > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      // Style settings
      pdf.setFont("helvetica");

      const lines = text.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith("# ")) {
          checkPage(12);
          pdf.setFontSize(18);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(30, 30, 40);
          pdf.text(trimmed.slice(2), margin, y);
          y += 10;
        } else if (trimmed.startsWith("## ")) {
          checkPage(10);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(40, 40, 55);
          pdf.text(trimmed.slice(3), margin, y);
          y += 8;
        } else if (trimmed.startsWith("### ")) {
          checkPage(8);
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(50, 50, 65);
          pdf.text(trimmed.slice(4), margin, y);
          y += 7;
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          checkPage(7);
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(50, 50, 60);
          const bulletText = "• " + trimmed.slice(2);
          const wrapped = pdf.splitTextToSize(bulletText, maxLineWidth - 4);
          pdf.text(wrapped, margin + 4, y);
          y += wrapped.length * 6;
        } else if (trimmed === "") {
          y += 3;
        } else {
          checkPage(7);
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(50, 50, 60);
          const wrapped = pdf.splitTextToSize(trimmed, maxLineWidth);
          pdf.text(wrapped, margin, y);
          y += wrapped.length * 6;
        }
      }

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(160, 160, 170);
        pdf.text(
          `Obsidian Digitize — Page ${i} of ${pageCount}`,
          margin,
          pdf.internal.pageSize.getHeight() - 8
        );
      }

      pdf.save("obsidian-transcription.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div
      className="animate-fade-up"
      style={{
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap" as const,
        alignItems: "center",
        padding: "1rem 1.25rem",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
      }}
    >
      <span
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          marginRight: "0.25rem",
          whiteSpace: "nowrap" as const,
        }}
      >
        Export
      </span>

      <ExportBtn
        id="btn-copy-text"
        label={copied ? "Copied!" : "Copy Text"}
        icon={<Copy size={15} />}
        onClick={handleCopy}
        active={copied}
      />

      <ExportBtn
        id="btn-download-docx"
        label={exportingDocx ? "Generating…" : "Download .docx"}
        icon={<FileDown size={15} />}
        onClick={handleDocx}
        accentColor="var(--accent-violet)"
      />

      <ExportBtn
        id="btn-download-pdf"
        label={exportingPdf ? "Generating…" : "Download .pdf"}
        icon={<File size={15} />}
        onClick={handlePdf}
        accentColor="#f97316"
      />
    </div>
  );
}
