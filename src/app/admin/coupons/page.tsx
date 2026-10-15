"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Textarea, Select, Badge, Modal, EmptyState, Loading, Pagination, useToast } from "@/components/ui";
import { AdminNav } from "../AdminNav";
import { api, type Paginated } from "../api";

type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderValue: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  validUntil: string | null;
};

const EMPTY: {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderValue: string;
  maxDiscount: string;
  usageLimit: string;
  isActive: boolean;
} = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderValue: "",
  maxDiscount: "",
  usageLimit: "",
  isActive: true,
};

function toForm(c: CouponRow) {
  return {
    code: c.code,
    description: c.description ?? "",
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    minOrderValue: c.minOrderValue ? String(c.minOrderValue) : "",
    maxDiscount: c.maxDiscount ? String(c.maxDiscount) : "",
    usageLimit: c.usageLimit ? String(c.usageLimit) : "",
    isActive: c.isActive,
  };
}

export default function AdminCouponsPage() {
  const { push } = useToast();
  const [data, setData] = useState<Paginated<CouponRow> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<CouponRow>>(`/api/admin/coupons?page=${page}&limit=20`));
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to load coupons", "error");
    } finally {
      setLoading(false);
    }
  }, [page, push]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }
  function openEdit(c: CouponRow) {
    setEditing(c);
    setForm(toForm(c));
    setModalOpen(true);
  }

  async function save() {
    if (!form.code.trim() || !form.discountValue) {
      push("Code and discount value are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        ...(form.minOrderValue.trim() ? { minOrderValue: Number(form.minOrderValue) } : {}),
        ...(form.maxDiscount.trim() ? { maxDiscount: Number(form.maxDiscount) } : {}),
        ...(form.usageLimit.trim() ? { usageLimit: Number(form.usageLimit) } : {}),
        isActive: form.isActive,
      };
      await api(editing ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      push(editing ? "Coupon updated" : "Coupon created", "success");
      setModalOpen(false);
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, code: string) {
    if (!confirm(`Delete coupon ${code}?`)) return;
    try {
      await api(`/api/admin/coupons/${id}`, { method: "DELETE" });
      push("Coupon deleted", "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Coupons</h1>
        <Button onClick={openNew}>+ New coupon</Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No coupons yet" hint="Create discount coupons for your shoppers." />
        ) : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Usage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold">{c.code}</p>
                        {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        {c.maxDiscount ? <span className="text-xs text-slate-500"> up to ₹{c.maxDiscount}</span> : null}
                        {c.minOrderValue ? <span className="text-xs text-slate-500"> · min ₹{c.minOrderValue}</span> : null}
                      </td>
                      <td className="px-4 py-3">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                      <td className="px-4 py-3">
                        <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => remove(c.id, c.code)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit coupon" : "New coupon"} wide>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" maxLength={30} />
          <Select label="Discount type" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as "PERCENTAGE" | "FIXED" })}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed (₹)</option>
          </Select>
          <Input label={form.discountType === "PERCENTAGE" ? "Discount %" : "Discount (₹)"} type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
          <Input label="Min order value (₹, optional)" type="number" min="0" step="0.01" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} />
          <Input label="Max discount (₹, optional)" type="number" min="0" step="0.01" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
          <Input label="Usage limit (optional)" type="number" min="1" step="1" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          <div className="md:col-span-2">
            <Textarea label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-fusion-600" />
            Active
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <Button loading={saving} onClick={save}>{editing ? "Save changes" : "Create coupon"}</Button>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
