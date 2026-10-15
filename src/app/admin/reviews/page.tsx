"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Badge, EmptyState, Loading, Pagination, RatingStars, useToast } from "@/components/ui";
import { AdminNav } from "../AdminNav";
import { api, type Paginated } from "../api";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  product: { id: string; name: string };
  user: { id: string; name: string | null; email: string };
};

export default function AdminReviewsPage() {
  const { push } = useToast();
  const [data, setData] = useState<Paginated<ReviewRow> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<ReviewRow>>(`/api/admin/reviews?page=${page}&limit=20`));
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  }, [page, push]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await api(`/api/admin/reviews/${id}`, { method: "DELETE" });
      push("Review deleted", "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <h1 className="mt-6 font-display text-2xl font-bold">Reviews</h1>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No reviews yet" />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {data.items.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <RatingStars value={r.rating} />
                        {r.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                      </div>
                      {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                      {r.body && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.body}</p>}
                      <p className="mt-2 text-xs text-slate-500">
                        {r.user.name ?? r.user.email} on <span className="font-medium">{r.product.name}</span> ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => remove(r.id)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
