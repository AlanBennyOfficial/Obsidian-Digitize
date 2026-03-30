# Obsidian Digitize — Technical Documentation

> **Version:** 0.1.0  
> **Framework:** Next.js 16.2.1 (App Router)  
> **AI SDK:** Vercel AI SDK v6  
> **Last Updated:** 2026-03-30

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [Tech Stack & Dependencies](#3-tech-stack--dependencies)
4. [Environment Setup](#4-environment-setup)
5. [Architecture & Data Flow](#5-architecture--data-flow)
6. [Backend: The API Route](#6-backend-the-api-route)
7. [Frontend: Page & State Machine](#7-frontend-page--state-machine)
8. [Components](#8-components)
9. [Design System: Midnight Obsidian](#9-design-system-midnight-obsidian)
10. [Export Pipeline](#10-export-pipeline)
11. [Configuration](#11-configuration)
12. [Running Locally](#12-running-locally)
13. [Adding a New AI Provider](#13-adding-a-new-ai-provider)
14. [Known Limitations & Notes](#14-known-limitations--notes)

---

## 1. Overview

**Obsidian Digitize** is a zero-friction, browser-based tool that converts handwritten notes or scanned documents (images and PDFs) into structured, editable text using large language models (LLMs).

The core philosophy is **"two clicks to digitize"**:

1. Drop a file into the drop zone.
2. Click **Digitize**.

The result is rendered as editable Markdown and can be exported to three formats:

| Format | Method |
|--------|--------|
| Plain text | Clipboard API |
| Microsoft Word (`.docx`) | `docx` npm package (client-side) |
| PDF (`.pdf`) | `jspdf` npm package (client-side) |

The application supports three AI backends, switchable via dropdown:

| Selection | Model | Provider |
|-----------|-------|----------|
| `gemini` | `gemini-2.5-pro-preview-03-25` | Google AI |
| `openai` | `gpt-4o` | OpenAI |
| `local` | Any OpenAI-compatible server (LM Studio, vLLM) | Local |

---

## 2. Project Structure

```
obsidian-digitize/
│
├── app/                          # Next.js App Router root
│   ├── globals.css               # Global styles + design system tokens
│   ├── layout.tsx                # Root HTML layout, fonts, SEO metadata
│   ├── page.tsx                  # Main page — orchestrates all UI & state
│   └── api/
│       └── digitize/
│           └── route.ts          # POST /api/digitize — universal AI endpoint
│
├── components/                   # Reusable React components
│   ├── DropZone.tsx              # Drag-and-drop file input
│   ├── LoadingSpinner.tsx        # Processing animation
│   ├── OutputPane.tsx            # Edit / Preview toggle for transcribed text
│   └── ExportBar.tsx             # Copy / .docx / .pdf export buttons
│
├── .env.local                    # Secret API keys (not committed)
├── .env.local.example            # Template for required env vars
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── DOCUMENTATION.md              # This file
```

---

## 3. Tech Stack & Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.1 | Full-stack React framework (App Router) |
| `react` / `react-dom` | 19.2.4 | UI library |
| `ai` | ^6.0.141 | Vercel AI SDK — unified interface for LLMs |
| `@ai-sdk/google` | ^3.0.54 | Google Gemini provider adapter |
| `@ai-sdk/openai` | ^3.0.48 | OpenAI / compatible provider adapter |
| `docx` | ^9.6.1 | Programmatic Word document generation |
| `jspdf` | ^4.2.1 | Client-side PDF generation |
| `react-markdown` | ^10.1.0 | Renders Markdown as React elements |
| `lucide-react` | ^1.7.0 | Icon library (SVG icons) |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5 | Static type checking |
| `tailwindcss` | ^4 | Utility-class CSS (used minimally for `hidden`, layout) |
| `@tailwindcss/postcss` | ^4 | PostCSS integration for Tailwind v4 |
| `eslint` / `eslint-config-next` | ^9 / 16.2.1 | Code linting |
| `@types/node`, `@types/react`, `@types/react-dom` | — | TypeScript type definitions |

---

## 4. Environment Setup

Create a `.env.local` file in the project root (copy from `.env.local.example`):

```env
# Google Gemini — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=

# OpenAI — https://platform.openai.com/api-keys
OPENAI_API_KEY=

# Local LLM (LM Studio / vLLM)
LOCAL_LLM_API_KEY=lm-studio-or-vllm-key
LOCAL_LLM_URL=http://localhost:1234/v1
```

**IMPORTANT:** `GEMINI_API_KEY` is required to use the Gemini model. `OPENAI_API_KEY` is required for GPT-4o. The Local LLM option requires a running LM Studio or vLLM server at `LOCAL_LLM_URL`.

**CAUTION:** Never commit `.env.local` to version control. It is listed in `.gitignore` by default in Next.js projects.

### How Environment Variables Are Used

The API keys are read exclusively on the **server** inside `app/api/digitize/route.ts` via `process.env.*`. They are never sent to the browser.

```typescript
// Example: local provider reads from env
const localAI = createOpenAI({
  baseURL: process.env.LOCAL_LLM_URL ?? "http://localhost:1234/v1",
  apiKey: process.env.LOCAL_LLM_API_KEY ?? "local",
});
```

---

## 5. Architecture & Data Flow

The app follows a straightforward client → server → AI provider → client flow:

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (Client — app/page.tsx)                                │
│                                                                 │
│  1. User selects model (dropdown)                               │
│  2. User drops / selects a file (DropZone)                      │
│  3. User clicks "Digitize"                                      │
│  4. fetch() → POST /api/digitize (FormData)                     │
│  5. Await response → render OutputPane + ExportBar              │
└───────────────────┬─────────────────────────────────────────────┘
                    │ multipart/form-data
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  NEXT.JS SERVER (app/api/digitize/route.ts)                     │
│                                                                 │
│  1. Parse FormData → extract `file` + `modelSelection`          │
│  2. Validate file type (JPEG, PNG, WebP, PDF)                   │
│  3. Read file bytes → Uint8Array                                │
│  4. Switch on modelSelection → instantiate AI model             │
│  5. Call generateText() with file attachment                    │
│  6. Return { text } JSON                                        │
└───────────────────┬─────────────────────────────────────────────┘
                    │ HTTPS API call
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI PROVIDER (Google / OpenAI / Local)                          │
│                                                                 │
│  Receives: system prompt + user text + raw file bytes           │
│  Returns: transcribed text string                               │
└─────────────────────────────────────────────────────────────────┘
```

**Key design choice:** The file bytes are uploaded once — browser to Next.js server. The server relays them to the AI provider. **The browser never calls the AI provider directly.** This keeps API keys safe on the server and avoids CORS issues.

---

## 6. Backend: The API Route

**File:** `app/api/digitize/route.ts`

### 6.1 Endpoint Specification

```
POST /api/digitize
Content-Type: multipart/form-data

Fields:
  file            (File)    — The image or PDF to transcribe
  modelSelection  (string)  — "gemini" | "openai" | "local"

Response (success):
  HTTP 200  { "text": "...transcribed content..." }

Response (error):
  HTTP 400 | 500  { "error": "...description..." }
```

### 6.2 Request Validation

Two layers of validation before any AI call is made:

**1. Presence check** — returns `400` if no `file` field is in FormData.

**2. MIME type allowlist** — only the following types are accepted:

```typescript
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/jpg",
  "image/png", "image/webp",
  "application/pdf",
]);
```

Any other MIME type returns `400`. This prevents non-vision files from being forwarded to a model that cannot process them.

### 6.3 The AI Switchboard

A `switch` statement on `modelSelection` determines which model to instantiate:

```typescript
switch (modelSelection) {
  case "gemini":
    // Gemini 2.5 Pro — best for multimodal handwriting tasks
    selectedModel = google("gemini-2.5-pro-preview-03-25");
    break;

  case "openai":
    // GPT-4o — vision capable, strong handwriting recognition
    selectedModel = openai("gpt-4o");
    break;

  case "local":
    // Uses the OpenAI adapter pointed at a local server (LM Studio / vLLM)
    const localAI = createOpenAI({
      baseURL: process.env.LOCAL_LLM_URL ?? "http://localhost:1234/v1",
      apiKey: process.env.LOCAL_LLM_API_KEY ?? "local",
    });
    selectedModel = localAI("local-model-name");
    break;
}
```

The `local` case uses `createOpenAI()` (from `@ai-sdk/openai`) with a custom `baseURL`. This is the standard adapter pattern for any OpenAI-compatible REST server:

- **LM Studio** — runs at `http://localhost:1234/v1` by default; serves whichever model is loaded
- **vLLM** — high-throughput inference server with an OpenAI-compatible API
- **Ollama** — with its OpenAI compatibility layer enabled

### 6.4 The System Prompt

```
You are an elite transcription AI. Extract all handwritten or printed text
from the provided image/document. Output ONLY the transcribed text. Preserve
all structure, headings, bullet points, and tables. If a word is completely
illegible, write [illegible]. Do not wrap the output in markdown code blocks.
```

Key directives:
- **"Output ONLY the transcribed text"** — suppresses preamble like "Sure! Here is…"
- **"Preserve all structure"** — emits Markdown headings (`#`) and bullets (`-`)
- **"[illegible]"** — safe fallback for unreadable words instead of hallucination
- **"Do not wrap in code blocks"** — prevents ` ```markdown ``` ` fencing that would break preview

### 6.5 Message Construction

The Vercel AI SDK v6 uses a typed `messages` array. File attachments use a `FilePart`:

```typescript
const { text } = await generateText({
  model: selectedModel,
  system: SYSTEM_PROMPT,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Please transcribe all text from the following file:" },
        { type: "file", data: uint8Array, mediaType },  // FilePart
      ],
    },
  ],
});
```

> **SDK v6 field name:** Use `mediaType`, **not** `mimeType`. The field was renamed in AI SDK v6; using `mimeType` produces a TypeScript error because it is not a known property of `FilePart`.

The file is passed as **raw bytes** (`Uint8Array`) rather than a base64 string or URL, for binary correctness and zero encoding overhead.

### 6.6 Error Handling

```typescript
try {
  // ...validation + AI call...
  return NextResponse.json({ text });
} catch (err: unknown) {
  console.error("[/api/digitize] Error:", err);
  const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
  return NextResponse.json({ error: message }, { status: 500 });
}
```

The client checks both `!res.ok` (HTTP status) and `data.error` (application-level error field) to detect failures.

---

## 7. Frontend: Page & State Machine

**File:** `app/page.tsx`

This is a `"use client"` component that owns all application state and composes the four child components.

### 7.1 Application State

| State Variable | Type | Purpose |
|---|---|---|
| `selectedModel` | `"gemini" \| "openai" \| "local"` | Which AI provider is selected |
| `file` | `File \| null` | The currently staged file |
| `appState` | `"idle" \| "loading" \| "done" \| "error"` | Current workflow phase |
| `outputText` | `string` | The transcribed Markdown text |
| `errorMsg` | `string` | Last error message |

Derived booleans computed from `appState`:
```typescript
const isLoading   = appState === "loading";
const isDone      = appState === "done";
const isError     = appState === "error";
const canDigitize = !!file && !isLoading;  // Guards the Digitize button
```

### 7.2 User Flow (State Machine)

```
idle ──(file added)──────────────────────────────► idle  (resets existing output)
  │
  └─(Digitize clicked, file present)
        │
        ▼
     loading ──(API success)──► done
        │
        └─(API failure)──► error ──(Reset clicked)──► idle
```

Which section renders in each state:

| State | DropZone | LoadingSpinner | OutputPane + ExportBar | Error Banner |
|-------|:--------:|:--------------:|:----------------------:|:------------:|
| `idle` | ✅ | ❌ | ❌ | ❌ |
| `loading` | ❌ | ✅ | ❌ | ❌ |
| `done` | ✅ | ❌ | ✅ | ❌ |
| `error` | ✅ | ❌ | ❌ | ✅ |

The DropZone remains visible in `done` and `error` states so users can immediately try a different file without resetting manually.

### 7.3 The Digitize Request

```typescript
const handleDigitize = async () => {
  if (!file) return;
  setAppState("loading");

  // Build multipart body
  const formData = new FormData();
  formData.append("file", file);
  formData.append("modelSelection", selectedModel);

  const res = await fetch("/api/digitize", { method: "POST", body: formData });
  const data = await res.json();

  if (!res.ok || data.error) throw new Error(data.error ?? `Server error (${res.status})`);

  setOutputText(data.text ?? "");
  setAppState("done");
};
```

`FormData` is used rather than JSON because the file is binary. The browser's native `fetch` API automatically sets the correct `multipart/form-data` `Content-Type` header with the boundary.

---

## 8. Components

### 8.1 DropZone (`components/DropZone.tsx`)

**Props:**
```typescript
interface DropZoneProps {
  onFile: (file: File) => void;  // Called when a valid file is selected
  disabled?: boolean;            // Disables interaction during loading
}
```

**What it does:**
- Renders a large dashed-border drop target area
- Handles `dragover`, `dragleave`, and `drop` native DOM events
- Maintains a hidden `<input type="file">` for click-to-browse (desktop)
- Maintains a second hidden `<input type="file" capture="environment">` for mobile cameras
- **Validates** the file before calling `onFile`:
  - Extension must be one of: `jpg`, `jpeg`, `png`, `webp`, `pdf`
  - File size must not exceed 20 MB
- Shows selected file's name and size with an appropriate icon
- Shows an inline error message on validation failure
- Provides a `×` button to deselect the file

**Mobile behavior:** The `capture="environment"` attribute on the secondary input tells mobile browsers to launch the rear camera directly. This is intentional for the "photograph your handwritten note" use case. On desktop it has no effect.

**State:**
```typescript
const [isDragging, setIsDragging]   = useState(false);
const [currentFile, setCurrentFile] = useState<File | null>(null);
const [error, setError]             = useState<string | null>(null);
```

---

### 8.2 LoadingSpinner (`components/LoadingSpinner.tsx`)

**Props:**
```typescript
interface LoadingSpinnerProps {
  model: string;  // "gemini" | "openai" | "local"
}
```

**What it does:**
- Replaces the DropZone while `appState === "loading"`
- Displays the name of the currently running model
- Renders a three-layer animated spinner:
  1. **Outer ring** — neon cyan, 1s clockwise rotation, drop-shadow glow
  2. **Inner ring** — violet, 1.5s counter-clockwise rotation, drop-shadow glow
  3. **Center icon** — `Brain` lucide icon in cyan
- Three bouncing cyan dots below the status text (staggered `animation-delay` of 0.16s per dot)

All animations use `@keyframes` defined in `globals.css`: `spin-ring` for ring rotation, `dot-bounce` for the scale/opacity oscillation.

---

### 8.3 OutputPane (`components/OutputPane.tsx`)

**Props:**
```typescript
interface OutputPaneProps {
  value: string;
  onChange: (value: string) => void;
}
```

**What it does:**
- Provides two tab views switchable via a pill-style tab bar:
  - **Edit** tab — a raw `<textarea>` in monospace font, fully editable (users can fix OCR errors)
  - **Preview** tab — renders the Markdown via `<ReactMarkdown>` inside `.prose-obsidian`
- Displays a live **character count** in the tab bar header
- Defaults to the Edit tab on first render

**Tab styling:** Active tab highlights with `--bg-elevated` background and an accent colour (cyan for Edit, violet for Preview).

**Markdown rendering:** `react-markdown` parses the string into standard HTML elements. The `.prose-obsidian` CSS class in `globals.css` provides full typographic styling for all Markdown elements.

---

### 8.4 ExportBar (`components/ExportBar.tsx`)

**Props:**
```typescript
interface ExportBarProps {
  text: string;  // The Markdown text to export
}
```

**What it does:**
- Renders three export buttons wired to the three export mechanisms
- Each button has hover micro-animations: border glow, tinted background, drop-shadow
- Copy button switches icon from `Copy` → `Check` for 2 seconds after success
- `.docx` and PDF buttons show `"Generating…"` during async generation

**Private sub-component `ExportBtn`:** Each button manages its own hover state (`useState(false)`) to drive inline style changes. The `accentColor` prop controls the hover tint and glow color per button.

---

## 9. Design System: Midnight Obsidian

**File:** `app/globals.css`

### 9.1 Color Tokens (CSS Custom Properties on `:root`)

**Backgrounds** — darkest to lightest:

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-void` | `#050505` | Page background |
| `--bg-deep` | `#080808` | Reserved |
| `--bg-surface` | `#0b0b0f` | Textarea, preview pane |
| `--bg-card` | `#11111a` | Cards, control bar, tab bar |
| `--bg-elevated` | `#1a1a24` | Buttons, select boxes, badges |
| `--bg-hover` | `#1f1f2e` | Hover states |

**Accents:**

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-cyan` | `#00f5e4` | Primary — active states, spinner, Digitize button |
| `--accent-cyan-dim` | `#00c4b7` | Hover / dimmed cyan |
| `--accent-violet` | `#a78bfa` | Secondary — preview tab, `.docx` button |
| `--accent-glow` | `rgba(0,245,228,0.15)` | Button box-shadow |
| `--accent-glow-strong` | `rgba(0,245,228,0.35)` | Button hover box-shadow |

**Text:**

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#ededed` | Main body text |
| `--text-secondary` | `#9999aa` | Sub-text, descriptions |
| `--text-muted` | `#555568` | Labels, placeholders, metadata |

**Borders:**

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | `rgba(255,255,255,0.06)` | Card edges |
| `--border-dim` | `rgba(255,255,255,0.10)` | Input edges |
| `--border-accent` | `rgba(0,245,228,0.40)` | Focus / active edges |

**Radii:**

| Token | Value |
|-------|-------|
| `--radius` | `6px` — cards, buttons, inputs |
| `--radius-sm` | `3px` — tags, badges |

### 9.2 Typography

Two fonts loaded in `app/layout.tsx` via `next/font/google`:

| Font | CSS Variable | Usage |
|------|-------------|-------|
| **Inter** | `--font-inter` | All body text, UI labels |
| **JetBrains Mono** | `--font-mono` | Textarea editor, char count, format badges |

Base size: `15px`, `line-height: 1.6`. Headings use `font-weight: 600`, `letter-spacing: -0.02em`.

### 9.3 Animation Keyframes

| Keyframe | Duration | Used by |
|----------|----------|---------|
| `fade-up` | 0.45s | `.animate-fade-up` — section entrance animations |
| `spin-ring` | 1s / 1.5s | Spinner rings in `LoadingSpinner` |
| `dot-bounce` | 1.4s | Bouncing dots + status badge dot |
| `pulse-glow` | 2s | `.animate-pulse-glow` — drop zone hover glow |
| `border-glow` | 2s | `.animate-border-glow` — reserved for future use |
| `shimmer` | — | Reserved for skeleton states |

### 9.4 Markdown Preview Styles (`.prose-obsidian`)

Applied to the wrapper `<div>` around `<ReactMarkdown>` in `OutputPane`. Provides complete typographic styling without external plugins:

| Element | Style |
|---------|-------|
| `h1` | `1.6rem`, neon cyan color |
| `h2` | `1.3rem`, subtle bottom border |
| `h3` | `1.1rem` |
| `code` | Monospace, cyan text, dark badge background |
| `pre` | Dark background, border, scroll overflow |
| `blockquote` | 3px left border in `--accent-cyan-dim` |
| `table / th / td` | Bordered, uppercase headers in cyan |
| `strong` | Off-white |
| `em` | Violet |

---

## 10. Export Pipeline

All three export operations run entirely **in-browser** — no server round-trip needed after transcription.

### 10.1 Copy to Clipboard

Uses the modern `navigator.clipboard.writeText(text)` Async Clipboard API.

**Fallback** for older browsers or restricted HTTP contexts:
```typescript
const el = document.createElement("textarea");
el.value = text;
document.body.appendChild(el);
el.select();
document.execCommand("copy");
document.body.removeChild(el);
```

**UX:** The button icon transitions from `Copy` → `Check` for 2000ms, then resets.

### 10.2 Word (.docx) Export

**Library:** `docx` v9

`markdownToDocxParagraphs(markdown)` performs a line-by-line parse:

| Markdown | docx Output |
|----------|-------------|
| `# Heading` | `Paragraph` with `HeadingLevel.HEADING_1` |
| `## Heading` | `Paragraph` with `HeadingLevel.HEADING_2` |
| `### Heading` | `Paragraph` with `HeadingLevel.HEADING_3` |
| `- item` or `* item` | `Paragraph` with `bullet: { level: 0 }` |
| *(empty line)* | Spacer `Paragraph` |
| Any other text | `Paragraph` with a plain `TextRun` at 12pt |

The `Document` is packed to a `Blob` via `Packer.toBlob()`, then downloaded via a programmatically constructed `<a>` element. The object URL is revoked immediately after the click to prevent memory leaks.

### 10.3 PDF Export

**Library:** `jspdf` v4

Uses jsPDF's direct text drawing API on an A4 portrait page:

| Setting | Value |
|---------|-------|
| Page format | A4, portrait |
| Margins | 18mm all sides |
| Font | Helvetica (built-in, no embedding) |
| H1 size | 18pt bold |
| H2 size | 14pt bold |
| H3 size | 12pt bold |
| Body size | 11pt normal |

- `pdf.splitTextToSize(text, maxWidth)` handles automatic line wrapping
- `checkPage(neededMm)` adds a new page when the cursor `y` nears the bottom margin
- Every page receives a footer: `"Obsidian Digitize — Page N of M"` at 8pt grey

---

## 11. Configuration

**File:** `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",  // Allows uploads up to 20MB
    },
  },
  serverExternalPackages: ["docx"],  // Exclude 'docx' from server bundle
};
```

**`bodySizeLimit: "20mb"`** — The default Next.js body limit is 4MB. Since `DropZone` allows files up to 20MB, the server must be configured to match.

**`serverExternalPackages: ["docx"]`** — The `docx` package is used only in the client component `ExportBar.tsx`. Marking it external prevents Next.js from attempting to bundle it server-side, where it would fail due to DOM dependencies.

---

## 12. Running Locally

```bash
# Navigate to the project directory
cd c:/GitHub/IDT-Product/obsidian-digitize

# Install dependencies (if not already installed)
npm install

# Create and populate your env file
copy .env.local.example .env.local
# Edit .env.local — fill in GEMINI_API_KEY and/or OPENAI_API_KEY

# Start the development server
npm run dev
# → http://localhost:3000
```

**Other scripts:**

| Command | Purpose |
|---------|---------|
| `npm run build` | Build production bundle to `.next/` |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint across `app/` and `components/` |
| `npx tsc --noEmit` | TypeScript type check (no output files) |

---

## 13. Adding a New AI Provider

To add a fourth provider (example: **Anthropic Claude**):

**Step 1 — Install the adapter:**
```bash
npm install @ai-sdk/anthropic
```

**Step 2 — Add to `app/api/digitize/route.ts`:**
```typescript
import { anthropic } from "@ai-sdk/anthropic";

// Inside the switch block:
case "anthropic": {
  selectedModel = anthropic("claude-opus-4-5");
  break;
}
```

**Step 3 — Add API key to `.env.local`:**
```env
ANTHROPIC_API_KEY=your_key_here
```

**Step 4 — Register in `app/page.tsx`:**
```typescript
// Add to the MODELS array:
{
  value: "anthropic",
  label: "Claude Opus",
  description: "Anthropic's most capable model",
  badge: "New",
  badgeColor: "#f59e0b",
},

// Update the type union:
type ModelOption = "gemini" | "openai" | "local" | "anthropic";
```

The rest of the UI adapts automatically — no other changes are needed.

---

## 14. Known Limitations & Notes

| Area | Limitation | Workaround / Notes |
|------|-----------|-------------------|
| **Local model name** | Hardcoded to `"local-model-name"` | LM Studio ignores the model field and serves its loaded model. For vLLM, change to your deployed model name in `route.ts`. |
| **DOCX/PDF fidelity** | Markdown parser is line-by-line only | Nested lists, inline `**bold**`, `*italic*`, and tables render as plain text in exports. Full Markdown-to-OOXML/PDF is out of scope. |
| **PDF pagination** | Basic automatic pagination | Very long documents may have edge cases in height calculation for complex content. |
| **File size** | 20MB client + server limit | Large multi-page PDF scans may time out depending on model API response latency. |
| **Local LLM vision** | Not all local models support image/file inputs | The `local` option only works with a multimodal model (e.g., LLaVA, Qwen-VL). Text-only models will return an error from the provider. |
| **Camera on mobile** | `capture="environment"` requires a secure context | Works on `localhost` (treated as secure) and HTTPS. Does not work on plain HTTP remote URLs. |
| **No authentication** | The API route has no auth | For production, add auth middleware (e.g., Clerk, NextAuth) and rate limiting before exposing the route publicly. |
