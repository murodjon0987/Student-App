import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label="Student App"
      className={cn("size-9 shrink-0", className)}
    >
      <defs>
        <linearGradient id="bm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="0.5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
        <linearGradient id="bm-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e4ff" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="118" fill="url(#bm-bg)" />
      <path
        d="M404 96l11 33 33 11-33 11-11 33-11-33-33-11 33-11 11-33z"
        fill="#fde68a"
      />
      <path d="M256 138 88 214l168 76 168-76-168-76z" fill="url(#bm-cap)" />
      <path
        d="M156 256v56c0 27 45 49 100 49s100-22 100-49v-56l-100 45-100-45z"
        fill="#ffffff"
        opacity="0.88"
      />
      <path
        d="M424 214v88"
        stroke="#fbbf24"
        strokeWidth="17"
        strokeLinecap="round"
      />
      <circle cx="424" cy="322" r="21" fill="#fbbf24" />
    </svg>
  );
}
