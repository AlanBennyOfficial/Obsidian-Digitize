/**
 * Obsidian Digitize — Main Page
 *
 * Orchestrates the full user flow:
 *   1. User selects AI model (Gemini / GPT-4o / Local)
 *   2. User drops or selects a file
 *   3. "Digitize" button fires the POST /api/digitize request
 *   4. LoadingSpinner replaces the drop zone during processing
 *   5. OutputPane + ExportBar appear on success
 */

"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Sparkles, ChevronDown, AlertCircle, RotateCcw } from "lucide-react";

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { OutputPane } from "@/components/OutputPane";

/**
 * ExportBar and DropZone are loaded client-only (ssr: false) because:
 *  - ExportBar imports `jspdf` and `docx` which reference browser globals
 *    (window, document, Blob) and produce different output during SSR,
 *    causing React hydration mismatches.
 *  - DropZone uses the `capture` attribute and File/FileReader APIs which
 *    are not available in Node.js.
 */
const ExportBar = dynamic(
  () => import("@/components/ExportBar").then((m) => ({ default: m.ExportBar })),
  { ssr: false, loading: () => null }
);

const DropZone = dynamic(
  () => import("@/components/DropZone").then((m) => ({ default: m.DropZone })),
  { ssr: false, loading: () => <div style={{ minHeight: 280 }} /> }
);

// ── Types ──────────────────────────────────────────────────────────────────
type ModelOption = "gemini" | "openai" | "local";
type AppState = "idle" | "loading" | "done" | "error";

interface ModelConfig {
  value: ModelOption;
  label: string;
  description: string;
  badge: string;
  badgeColor: string;
}

// ── Model options ──────────────────────────────────────────────────────────
const MODELS: ModelConfig[] = [
  {
    value: "gemini",
    label: "Gemini 2.5 Pro",
    description: "Best accuracy for complex handwriting",
    badge: "Recommended",
    badgeColor: "var(--accent-cyan)",
  },
  {
    value: "openai",
    label: "GPT-4o",
    description: "Strong vision model from OpenAI",
    badge: "Vision",
    badgeColor: "var(--accent-violet)",
  },
  {
    value: "local",
    label: "Local LLM",
    description: "Runs via LM Studio / vLLM on localhost",
    badge: "Private",
    badgeColor: "#f97316",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  // ── State ────────────────────────────────────────────────────────────────
  const [selectedModel, setSelectedModel] = useState<ModelOption>("gemini");
  const [file, setFile] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [outputText, setOutputText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const isLoading = appState === "loading";
  const isDone = appState === "done";
  const isError = appState === "error";
  const canDigitize = !!file && !isLoading;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    setFile(f);
    // Reset output when a new file is chosen
    setAppState("idle");
    setOutputText("");
    setErrorMsg("");
  }, []);

  const handleReset = () => {
    setFile(null);
    setAppState("idle");
    setOutputText("");
    setErrorMsg("");
  };

  const handleDigitize = async () => {
    if (!file) return;
    setAppState("loading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("modelSelection", selectedModel);

      const res = await fetch("/api/digitize", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server error (${res.status})`);
      }

      setOutputText(data.text ?? "");
      setAppState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
      setAppState("error");
    }
  };

  const activeModel = MODELS.find((m) => m.value === selectedModel)!;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-void)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <header
        style={{
          padding: "1.75rem 2rem 1.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          background:
            "linear-gradient(180deg, rgba(10,10,18,0.95) 0%, rgba(5,5,5,0.85) 100%)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              background:
                "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 18px var(--accent-glow)",
            }}
          >
            <Sparkles size={18} color="#050505" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                background:
                  "linear-gradient(90deg, var(--accent-cyan), var(--accent-violet))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              Obsidian Digitize
            </h1>
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
                marginTop: 1,
              }}
            >
              AI HANDWRITING TRANSCRIPTION
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.75rem",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius)",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isLoading
                ? "var(--accent-violet)"
                : isDone
                  ? "var(--accent-cyan)"
                  : isError
                    ? "#ff6b6b"
                    : "#555568",
              animation: isLoading ? "dot-bounce 1.4s ease-in-out infinite" : "none",
              display: "inline-block",
            }}
          />
          {isLoading
            ? "Processing…"
            : isDone
              ? "Transcription ready"
              : isError
                ? "Error"
                : "Ready"}
        </div>
      </header>

      {/* ── Page body ────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          maxWidth: 820,
          width: "100%",
          margin: "0 auto",
          padding: "2.5rem 1.5rem 4rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* ── Tagline ──────────────────────────────────────────────────────── */}
        <div className="animate-fade-up">
          <h2
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              marginBottom: "0.5rem",
            }}
          >
            Turn handwriting into
            <br />
            <span
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-cyan), var(--accent-violet))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              structured Markdown.
            </span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: 480 }}>
            Drop an image or PDF, choose your AI model, and hit{" "}
            <strong style={{ color: "var(--text-primary)" }}>Digitize</strong>. That&apos;s it.
          </p>
        </div>

        {/* ── Control Bar ──────────────────────────────────────────────────── */}
        <div
          className="animate-fade-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            padding: "1rem 1.25rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius)",
          }}
        >
          {/* Model selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, minWidth: 200 }}>
            <label
              htmlFor="model-select"
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              AI Model
            </label>
            <div style={{ position: "relative" }}>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ModelOption)}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "0.5rem 2.25rem 0.5rem 0.75rem",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "var(--radius)",
                  color: "var(--text-primary)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  appearance: "none",
                  outline: "none",
                  transition: "border-color 0.18s",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-cyan)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-dim)")}
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                color="var(--text-muted)"
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
            </div>
            {/* Description of selected model */}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span
                style={{
                  padding: "1px 5px",
                  borderRadius: "var(--radius-sm)",
                  background: `${activeModel.badgeColor}22`,
                  color: activeModel.badgeColor,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  border: `1px solid ${activeModel.badgeColor}44`,
                }}
              >
                {activeModel.badge}
              </span>
              {activeModel.description}
            </p>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 48,
              background: "var(--border-subtle)",
              flexShrink: 0,
            }}
          />

          {/* ── Digitize button ──────────────────────────────────────────── */}
          <button
            id="btn-digitize"
            onClick={handleDigitize}
            disabled={!canDigitize}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.75rem",
              background:
                canDigitize
                  ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-cyan-dim))"
                  : "var(--bg-elevated)",
              border: "none",
              borderRadius: "var(--radius)",
              color: canDigitize ? "#050505" : "var(--text-muted)",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: canDigitize ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              letterSpacing: "-0.01em",
              boxShadow: canDigitize ? "0 0 18px var(--accent-glow)" : "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (canDigitize) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 32px var(--accent-glow-strong)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = canDigitize
                ? "0 0 18px var(--accent-glow)"
                : "none";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            <Sparkles size={16} />
            Digitize
          </button>
        </div>

        {/* ── Drop Zone / Spinner ───────────────────────────────────────────── */}
        {isLoading ? (
          <LoadingSpinner model={selectedModel} />
        ) : (
          <DropZone onFile={handleFile} disabled={isLoading} />
        )}

        {/* ── Error state ───────────────────────────────────────────────────── */}
        {isError && (
          <div
            className="animate-fade-up"
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(255, 107, 107, 0.08)",
              border: "1px solid rgba(255, 107, 107, 0.3)",
              borderRadius: "var(--radius)",
              color: "#ff9d9d",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontWeight: 600, marginBottom: "0.2rem", fontSize: "0.9rem" }}>
                Transcription failed
              </p>
              <p style={{ fontSize: "0.85rem", color: "#ffb3b3" }}>{errorMsg}</p>
            </div>
            <button
              id="btn-retry"
              onClick={handleReset}
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.35rem 0.75rem",
                background: "rgba(255,107,107,0.12)",
                border: "1px solid rgba(255,107,107,0.3)",
                borderRadius: "var(--radius-sm)",
                color: "#ff9d9d",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        )}

        {/* ── Output zone (only when done) ──────────────────────────────────── */}
        {isDone && outputText && (
          <>
            {/* Section header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Transcription Result
              </h2>
              <button
                id="btn-new-file"
                onClick={handleReset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.3rem 0.65rem",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.color = "var(--text-primary)";
                  b.style.borderColor = "var(--border-accent)";
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.color = "var(--text-muted)";
                  b.style.borderColor = "var(--border-dim)";
                }}
              >
                <RotateCcw size={11} />
                New file
              </button>
            </div>

            {/* Edit / Preview output */}
            <OutputPane value={outputText} onChange={setOutputText} />

            {/* Export buttons */}
            <ExportBar text={outputText} />
          </>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Obsidian Digitize — Zero-friction handwriting transcription
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          &copy; 2026 <a href="https://github.com/alanbennyofficial">Alan Benny</a> & <a href="https://github.com/aryandhuri">Aryan Dhuri</a>.
        </p>
      </footer>
    </main>
  );
}
