"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

/* ---------- Button ---------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};
export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  const styles = {
    primary: "bg-fusion-600 hover:bg-fusion-700 text-white shadow-sm",
    secondary: "bg-fusion-50 hover:bg-fusion-100 text-fusion-800 dark:bg-fusion-950 dark:text-fusion-200 dark:hover:bg-fusion-900",
    ghost: "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  }[variant];
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  }[size];
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer", styles, sizes, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", className)} {...rest}>
      {children}
    </div>
  );
}

/* ---------- Input / Textarea / Select ---------- */
type FieldProps = { label?: string; error?: string; hint?: string };
export function Input({ label, error, hint, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>}
      <input
        className={cn("w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-fusion-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100", error && "border-red-500", className)}
        {...rest}
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function Textarea({ label, error, className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>}
      <textarea
        className={cn("w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-fusion-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100", error && "border-red-500", className)}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Select({ label, error, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>}
      <select
        className={cn("w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-fusion-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100", error && "border-red-500", className)}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

/* ---------- Badge ---------- */
export function Badge({ className, children, tone = "neutral" }: { className?: string; children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "brand" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    brand: "bg-fusion-100 text-fusion-800 dark:bg-fusion-950 dark:text-fusion-200",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones, className)}>{children}</span>;
}

/* ---------- Spinner ---------- */
export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" }[size];
  return (
    <svg className={cn("animate-spin text-fusion-600", s, className)} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <Spinner size="lg" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

/* ---------- Empty / Error states ---------- */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", hint, onRetry }: { title?: string; hint?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center" role="alert">
      <p className="font-display text-lg font-semibold text-red-700 dark:text-red-400">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">Try again</Button>}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className={cn("relative w-full rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900", wide ? "max-w-3xl" : "max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</Button>
      <span className="text-sm text-slate-600 dark:text-slate-300">Page {page} of {totalPages}</span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next →</Button>
    </nav>
  );
}

/* ---------- RatingStars ---------- */
export function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-glow-500", cls)} aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? "" : "opacity-30"}>★</span>
      ))}
    </span>
  );
}

/* ---------- Price ---------- */
export function Price({ price, discountPrice, size = "md" }: { price: number | string; discountPrice?: number | string | null; size?: "sm" | "md" | "lg" }) {
  const p = Number(price);
  const dp = discountPrice != null ? Number(discountPrice) : null;
  const show = dp != null && dp < p ? dp : p;
  const cls = { sm: "text-sm", md: "text-base", lg: "text-2xl" }[size];
  return (
    <span className={cn("inline-flex items-baseline gap-2", cls)}>
      <span className="font-bold text-slate-900 dark:text-white">₹{show.toLocaleString("en-IN")}</span>
      {dp != null && dp < p && <span className="text-sm text-slate-400 line-through">₹{p.toLocaleString("en-IN")}</span>}
    </span>
  );
}

/* ---------- Toast ---------- */
type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
const ToastCtx = createContext<{ push: (message: string, tone?: Toast["tone"]) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cn("rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg",
            t.tone === "success" && "bg-emerald-600", t.tone === "error" && "bg-red-600", t.tone === "info" && "bg-slate-800")}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
