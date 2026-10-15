"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, useToast } from "@/components/ui";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from "@/lib/orders";
import type { OrderStatus } from "@prisma/client";

const ALL = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export function OrderStatusSelect({ orderId, current, basePath = "/api/seller/orders" }: { orderId: string; current: OrderStatus; basePath?: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [value, setValue] = useState<OrderStatus>(current);
  const [saving, setSaving] = useState(false);

  const allowed = ORDER_TRANSITIONS[current] ?? [];

  async function change(next: OrderStatus) {
    setValue(next);
    if (next === current) return;
    setSaving(true);
    try {
      const res = await fetch(`${basePath}/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Update failed");
      push(`Order moved to ${ORDER_STATUS_LABELS[next]}`, "success");
      router.refresh();
    } catch (err) {
      setValue(current);
      push(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setSaving(false);
    }
  }

  if (allowed.length === 0) {
    return <span className="text-sm text-slate-500">{ORDER_STATUS_LABELS[current]}</span>;
  }

  return (
    <Select
      value={value}
      disabled={saving}
      onChange={(e) => change(e.target.value as OrderStatus)}
      aria-label="Update order status"
    >
      {[current, ...allowed.filter((s) => s !== current)]
        .filter((s, i, arr) => arr.indexOf(s) === i)
        .map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
    </Select>
  );
}

export { ALL };
