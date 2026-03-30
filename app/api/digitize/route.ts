/**
 * POST /api/digitize
 *
 * Universal AI digitization endpoint.
 * Accepts a multipart/form-data body containing:
 *   - file          : The image or PDF to transcribe
 *   - modelSelection: "gemini" | "openai" | "local"
 *
 * Returns JSON: { text: string }        on success
 *               { error: string }       on failure
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

// ── System prompt for the transcription model ──────────────────────────────
const SYSTEM_PROMPT = `You are an elite transcription AI. Extract all handwritten or printed text from the provided image/document. Output ONLY the transcribed text. Preserve all structure, headings, bullet points, and tables. If a word is completely illegible, write [illegible]. Do not wrap the output in markdown code blocks.`;

// ── Allowed MIME types ─────────────────────────────────────────────────────
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

// ── Main handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const modelSelection = (formData.get("modelSelection") as string) ?? "gemini";

    // 2. Validate file
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Please upload an image (JPEG/PNG/WebP) or PDF.` },
        { status: 400 }
      );
    }

    // 3. Convert File to buffer (Uint8Array)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 4. Determine media type for AI SDK (v6 uses `mediaType`, not `mimeType`)
    const mediaType = file.type as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "application/pdf";

    // 5. ── Switchboard: pick the model ──────────────────────────────────────
    let selectedModel;

    switch (modelSelection) {
      case "gemini": {
        // Gemini 2.5 Pro — best for multimodal handwriting tasks
        selectedModel = google("gemini-2.5-pro-preview-03-25");
        break;
      }

      case "openai": {
        // GPT-4o — vision capable, strong handwriting recognition
        selectedModel = openai("gpt-4o");
        break;
      }

      case "local":
        // Local LLM is handled CLIENT-SIDE (see lib/local-llm.ts).
        // The browser calls localhost directly — Vercel cannot reach it.
        return NextResponse.json(
          { error: "Local LLM requests are handled directly in the browser and should not reach this endpoint. Please ensure you are using the latest client." },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { error: `Unknown model selection: "${modelSelection}".` },
          { status: 400 }
        );
    }

    // 6. Build the message content for a vision request
    //    The AI SDK expects `experimental_attachments` or inline content blocks.
    //    We use inline data-URL style for maximum compatibility.
    const { text } = await generateText({
      model: selectedModel,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please transcribe all text from the following file:",
            },
            {
              type: "file",
              data: uint8Array,
              mediaType,
            },
          ],
        },
      ],
    });

    // 7. Return transcribed text
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error("[/api/digitize] Error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

