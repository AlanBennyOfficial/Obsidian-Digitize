/**
 * lib/local-llm.ts
 *
 * Client-side helper that calls a local OpenAI-compatible LLM (e.g. LM Studio)
 * directly from the browser. This bypasses the Vercel server entirely —
 * Vercel's servers cannot reach localhost on the user's machine, but the
 * user's browser CAN.
 *
 * Architecture:
 *   Browser (user's machine) ───► localhost:1234/v1/chat/completions
 *
 * Prerequisites:
 *   - LM Studio (or vLLM / Ollama with OpenAI compat) running locally
 *   - A vision-capable model loaded (e.g. LLaVA, Qwen2-VL, Pixtral)
 *   - CORS enabled in LM Studio (Settings → Server → Enable CORS)
 */

const SYSTEM_PROMPT = `You are an elite transcription AI. Extract all handwritten or printed text from the provided image/document. Output ONLY the transcribed text. Preserve all structure, headings, bullet points, and tables. If a word is completely illegible, write [illegible]. Do not wrap the output in markdown code blocks.`;

/** Convert a File to a base64 data-URL string ("data:image/...;base64,...") */
function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file as base64."));
    reader.readAsDataURL(file);
  });
}

/**
 * Call a local LLM directly from the browser.
 *
 * @param file     The image or PDF file to transcribe
 * @param baseUrl  The local server URL, e.g. "http://localhost:1234"
 * @param apiKey   Optional API key (most local servers accept anything)
 * @returns        The transcribed text
 */
export async function transcribeWithLocalLLM(
  file: File,
  baseUrl: string = "http://localhost:1234",
  apiKey: string = "lm-studio"
): Promise<string> {
  const dataUrl = await fileToBase64DataUrl(file);

  const normalizedUrl = baseUrl.replace(/\/+$/, "");
  const endpoint = `${normalizedUrl}/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "local-model",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Please transcribe all text from the following file:" },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Local LLM returned ${response.status}: ${errorBody}\n\n` +
      `Make sure LM Studio is running at ${normalizedUrl} with a vision model loaded ` +
      `and CORS enabled (Settings → Server → Enable CORS).`
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (typeof text !== "string" || text.trim() === "") {
    throw new Error(
      "Local LLM returned an empty response. The model may not support vision input."
    );
  }

  return text.trim();
}
