"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, useToast } from "@/components/ui";

export function ProductRowActions({ id }: { id: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/seller/products/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Delete failed");
      push("Product deleted", "success");
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/seller/products/${id}/edit`}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-fusion-600 hover:bg-fusion-50 dark:hover:bg-fusion-950"
      >
        Edit
      </Link>
      <Button variant="danger" size="sm" loading={deleting} onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
