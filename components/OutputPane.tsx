/**
 * OutputPane component
 *
 * Split-pane view showing:
 *   - Left / "Edit" tab  : raw editable <textarea>
 *   - Right / "Preview" tab : react-markdown rendered preview
 *
 * On narrow screens the two tabs are toggled with a pill switcher.
 */

"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Edit3, Eye } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface OutputPaneProps {
  value: string;
  onChange: (value: string) => void;
}

type Tab = "edit" | "preview";

// ── Component ──────────────────────────────────────────────────────────────
export function OutputPane({ value, onChange }: OutputPaneProps) {
  const [activeTab, setActiveTab] = useState<Tab>("edit");

  // Pill tab button styling
  const tabStyle = (tab: Tab) => ({
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.375rem 0.875rem",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    transition: "background 0.18s, color 0.18s",
    background:
      activeTab === tab
        ? "var(--bg-elevated)"
        : "transparent",
    color:
      activeTab === tab
        ? activeTab === "edit"
          ? "var(--accent-cyan)"
          : "var(--accent-violet)"
        : "var(--text-muted)",
    outline: "none",
  });

  return (
    <div
      className="animate-fade-up"
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 400,
      }}
    >
      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 0.75rem",
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-sm)",
            padding: 3,
            gap: 2,
          }}
        >
          <button
            id="tab-edit"
            style={tabStyle("edit")}
            onClick={() => setActiveTab("edit")}
            aria-label="Switch to Edit tab"
          >
            <Edit3 size={13} />
            Edit
          </button>
          <button
            id="tab-preview"
            style={tabStyle("preview")}
            onClick={() => setActiveTab("preview")}
            aria-label="Switch to Preview tab"
          >
            <Eye size={13} />
            Preview
          </button>
        </div>

        {/* Character count */}
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {value.length.toLocaleString()} chars
        </span>
      </div>

      {/* ── Edit pane ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: activeTab === "edit" ? "flex" : "none",
          flex: 1,
        }}
      >
        <textarea
          id="output-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck
          aria-label="Transcribed text editor"
          style={{
            flex: 1,
            resize: "none",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "none",
            outline: "none",
            padding: "1.25rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.875rem",
            lineHeight: 1.7,
            minHeight: 400,
            caretColor: "var(--accent-cyan)",
          }}
          placeholder="Transcribed text will appear here…"
        />
      </div>

      {/* ── Preview pane ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: activeTab === "preview" ? "block" : "none",
          flex: 1,
          background: "var(--bg-surface)",
          padding: "1.25rem",
          overflowY: "auto",
          minHeight: 400,
        }}
      >
        {value.trim() ? (
          <div className="prose-obsidian">
            <ReactMarkdown>{value}</ReactMarkdown>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>
            Nothing to preview yet.
          </p>
        )}
      </div>
    </div>
  );
}
