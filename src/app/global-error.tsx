"use client";

import type { ErrorRecoveryProps } from "@/components/error-recovery";

export default function GlobalError({ retry }: ErrorRecoveryProps) {
  return (
    <html lang="uz">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", boxSizing: "border-box" }}>
          <div role="alert" style={{ maxWidth: "420px", textAlign: "center" }}>
            <h1>Ilovani ochishda xatolik yuz berdi</h1>
            <p>Ulanishni tekshiring va qayta urinib ko&apos;ring.</p>
            <button onClick={retry} style={{ border: 0, borderRadius: "12px", padding: "12px 20px", background: "#4f46e5", color: "white", cursor: "pointer", font: "inherit" }}>
              Qayta urinish
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
