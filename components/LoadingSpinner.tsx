/**
 * LoadingSpinner component
 *
 * Displayed while the AI model is processing the uploaded file.
 * Features a glowing neon-cyan ring spinner and pulsing status text.
 */

"use client";

import { Brain } from "lucide-react";

interface LoadingSpinnerProps {
  model: string;
}

// Human-readable model names for display
const MODEL_LABELS: Record<string, string> = {
  gemini: "Gemini 2.5 Pro",
  openai: "GPT-4o",
  local: "Local LLM",
};

export function LoadingSpinner({ model }: LoadingSpinnerProps) {
  const label = MODEL_LABELS[model] ?? model;

  return (
    <div
      className="animate-fade-up"
      style={{
        padding: "4rem 2rem",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        minHeight: "280px",
      }}
    >
      {/* ── Spinner ring ─────────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: 72, height: 72 }}>
        {/* Outer glow ring */}
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "var(--accent-cyan)",
            animation: "spin-ring 1s linear infinite",
            filter: "drop-shadow(0 0 6px var(--accent-cyan))",
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            position: "absolute",
            inset: 6,
            borderRadius: "50%",
            border: "1.5px solid transparent",
            borderBottomColor: "var(--accent-violet)",
            animation: "spin-ring 1.5s linear infinite reverse",
            filter: "drop-shadow(0 0 4px var(--accent-violet))",
          }}
        />
        {/* Center icon */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Brain size={24} color="var(--accent-cyan)" />
        </div>
      </div>

      {/* ── Status text ──────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: "1rem",
            color: "var(--text-primary)",
            marginBottom: "0.4rem",
          }}
        >
          Transcribing with {label}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Analyzing handwriting and extracting text…
        </p>

        {/* Bouncing dots */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: "var(--accent-cyan)",
                animation: `dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                filter: "drop-shadow(0 0 3px var(--accent-cyan))",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
