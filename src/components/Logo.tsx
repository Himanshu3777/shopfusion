import { cn } from "@/lib/utils";

/** Original ShopFusion logo: interlocking hexagon mark + wordmark. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 2 29 9.5v13L16 30 3 22.5v-13L16 2Z" fill="url(#sf-g)" />
        <path d="M16 8.5 23.5 12.8v8.4L16 25.5 8.5 21.2v-8.4L16 8.5Z" fill="white" fillOpacity="0.92" />
        <path d="M16 13.2 19.8 15.4v4.4L16 22 12.2 19.8v-4.4L16 13.2Z" fill="url(#sf-g)" />
        <defs>
          <linearGradient id="sf-g" x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8547ff" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      {!compact && (
        <span className="font-display text-xl font-bold tracking-tight">
          Shop<span className="bg-gradient-to-r from-fusion-600 to-glow-500 bg-clip-text text-transparent">Fusion</span>
        </span>
      )}
    </span>
  );
}
