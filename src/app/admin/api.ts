"use client";

/** Fetch helper for the { ok, data } API envelope. Throws on failure. */
export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const json = await res.json().catch(() => null);
  if (!json?.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
