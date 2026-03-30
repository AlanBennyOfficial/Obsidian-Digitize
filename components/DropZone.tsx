/**
 * DropZone component
 *
 * Handles drag-and-drop and click-to-browse file selection.
 * On mobile (via the `capture` attribute) it activates the camera.
 * Validates file type and size before calling `onFile`.
 */

"use client";

import { useRef, useState, useCallback, DragEvent, ChangeEvent } from "react";
import { Upload, FileImage, FileText, X, Camera } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_SIZE_MB = 20;
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];

// ── Helpers ────────────────────────────────────────────────────────────────
function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  const ext = getFileExtension(name);
  return ext === "pdf" ? FileText : FileImage;
}

// ── Component ──────────────────────────────────────────────────────────────
export function DropZone({ onFile, disabled = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate and accept a file
  const acceptFile = useCallback(
    (file: File) => {
      setError(null);
      const ext = getFileExtension(file.name);
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported format ".${ext}". Use JPG, PNG, WebP, or PDF.`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File too large (${formatSize(file.size)}). Max is ${MAX_SIZE_MB} MB.`);
        return;
      }
      setCurrentFile(file);
      onFile(file);
    },
    [onFile]
  );

  // ── Drag events ────────────────────────────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  };

  // ── Input change ─────────────────────────────────────────────────────
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // ── Remove file ──────────────────────────────────────────────────────
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentFile(null);
    setError(null);
  };


  return (
    <div className="drop-zone-wrapper">
      {/* Hidden file inputs – one for desktop, one for mobile camera */}
      <input
        ref={inputRef}
        id="file-input-desktop"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      {/* Mobile camera-first input */}
      <input
        id="file-input-camera"
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      {/* ── Drop zone surface ─────────────────────────────────────────────── */}
      <div
        role="button"
        aria-label="Upload file — click or drag and drop"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          background: isDragging
            ? "linear-gradient(135deg, rgba(0,245,228,0.06), rgba(167,139,250,0.04))"
            : currentFile
            ? "linear-gradient(135deg, rgba(0,245,228,0.04), rgba(0,196,183,0.02))"
            : "var(--bg-card)",
          border: isDragging
            ? "1.5px dashed var(--accent-cyan)"
            : currentFile
            ? "1.5px solid rgba(0,245,228,0.35)"
            : "1.5px dashed var(--border-dim)",
          borderRadius: "var(--radius)",
          padding: "3.5rem 2rem",
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "border-color 0.2s, background 0.2s",
          minHeight: "280px",
          position: "relative" as const,
          boxShadow: isDragging ? "0 0 0 4px var(--accent-glow)" : "none",
          opacity: disabled ? 0.5 : 1,
          userSelect: "none" as const,
        }}
        className={isDragging ? "animate-pulse-glow" : ""}
      >
        {currentFile ? (
          /* ── File selected state ─────────────────────────────────────── */
          <div className="animate-fade-up" style={{ textAlign: "center", width: "100%" }}>
            {currentFile && (() => {
              const Icon = getFileIcon(currentFile.name);
              return (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "var(--radius)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}
                >
                  <Icon size={28} color="var(--accent-cyan)" />
                </div>
              );
            })()}
            <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: "0.25rem" }}>
              {currentFile.name}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {formatSize(currentFile.size)}
            </p>
            <p style={{ color: "var(--accent-cyan)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
              Click to change file
            </p>
            {/* Remove button */}
            <button
              id="btn-remove-file"
              onClick={handleRemove}
              aria-label="Remove selected file"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-dim)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,107,107,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-dim)";
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          /* ── Empty state ─────────────────────────────────────────────── */
          <>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "var(--radius)",
                background: "var(--bg-elevated)",
                border: `1px solid ${isDragging ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.2s",
                flexShrink: 0,
              }}
            >
              <Upload
                size={30}
                color={isDragging ? "var(--accent-cyan)" : "var(--text-muted)"}
                style={{ transition: "color 0.2s" }}
              />
            </div>

            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: isDragging ? "var(--accent-cyan)" : "var(--text-primary)",
                  marginBottom: "0.375rem",
                  transition: "color 0.2s",
                }}
              >
                {isDragging ? "Drop to upload" : "Drop your file here"}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                or{" "}
                <span style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}>
                  click to browse
                </span>
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap" as const,
                justifyContent: "center",
                marginTop: "0.5rem",
              }}
            >
              {["JPG", "PNG", "WebP", "PDF"].map((fmt) => (
                <span
                  key={fmt}
                  style={{
                    padding: "2px 8px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    letterSpacing: "0.05em",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {fmt}
                </span>
              ))}
              <span
                style={{
                  padding: "2px 8px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.05em",
                }}
              >
                max {MAX_SIZE_MB} MB
              </span>
            </div>

            {/* Mobile camera hint */}
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "var(--text-muted)",
                fontSize: "0.78rem",
              }}
            >
              <Camera size={13} />
              Mobile: uses camera by default
            </p>
          </>
        )}
      </div>

      {/* ── Error message ─────────────────────────────────────────────────── */}
      {error && (
        <div
          className="animate-fade-up"
          style={{
            marginTop: "0.75rem",
            padding: "0.625rem 0.875rem",
            background: "rgba(255, 107, 107, 0.08)",
            border: "1px solid rgba(255, 107, 107, 0.3)",
            borderRadius: "var(--radius)",
            color: "#ff9d9d",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <X size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
