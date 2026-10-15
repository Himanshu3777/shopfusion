"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: { url: string; alt: string | null }[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
        {current ? (
          <img src={current.url} alt={current.alt ?? name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl text-slate-300">◈</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === active}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 dark:bg-slate-800",
                i === active ? "border-fusion-600" : "border-transparent hover:border-slate-300"
              )}
            >
              <img src={img.url} alt={img.alt ?? `${name} thumbnail ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
