import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Raise the multipart body-size limit so users can upload images/PDFs
   * up to 20 MB (the same limit enforced client-side in DropZone).
   *
   * Note: This setting applies to Server Actions. For Route Handlers
   * (app/api/*) the underlying Node.js HTTP server handles body size,
   * but keeping this aligned prevents unexpected rejections.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },

  /**
   * Keep these packages out of the server bundle entirely.
   *   - docx  : uses browser File/Blob APIs at runtime
   *   - jspdf : ships separate browser/node builds; prevent bundler confusion
   *
   * Both are used exclusively inside "use client" components that are
   * dynamically imported with ssr: false (see app/page.tsx).
   */
  serverExternalPackages: ["docx", "jspdf"],
};

export default nextConfig;
