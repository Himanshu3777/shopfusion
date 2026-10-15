"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Spinner, useToast } from "@/components/ui";

export default function CancelButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok)
        throw new Error(json?.error?.message ?? "Failed to cancel order");
      push("Order cancelled", "success");
      setOpen(false);
      router.refresh();
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to cancel order", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cancel this order?">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The order will be cancelled and the items will be returned to stock. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Keep order
          </Button>
          <Button onClick={cancel} disabled={busy}>
            {busy ? <Spinner size="sm" /> : "Yes, cancel"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
