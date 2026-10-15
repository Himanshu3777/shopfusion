"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Textarea, Badge, Modal, EmptyState, Loading, useToast } from "@/components/ui";
import { AdminNav } from "../AdminNav";
import { api } from "../api";

type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  position: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  position: "home-hero",
  isActive: true,
  sortOrder: "0",
};

export default function AdminBannersPage() {
  const { push } = useToast();
  const [items, setItems] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<BannerRow[]>("/api/admin/banners"));
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to load banners", "error");
    } finally {
      setLoading(false);
    }
  }, [push]);

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
  function openEdit(b: BannerRow) {
    setEditing(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      imageUrl: b.imageUrl ?? "",
      linkUrl: b.linkUrl ?? "",
      position: b.position,
      isActive: b.isActive,
      sortOrder: String(b.sortOrder),
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.title.trim()) {
      push("Title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        ...(form.subtitle.trim() ? { subtitle: form.subtitle.trim() } : {}),
        ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
        ...(form.linkUrl.trim() ? { linkUrl: form.linkUrl.trim() } : {}),
        position: form.position.trim() || "home-hero",
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder || 0),
      };
      await api(editing ? `/api/admin/banners/${editing.id}` : "/api/admin/banners", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      push(editing ? "Banner updated" : "Banner created", "success");
      setModalOpen(false);
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete banner "${title}"?`)) return;
    try {
      await api(`/api/admin/banners/${id}`, { method: "DELETE" });
      push("Banner deleted", "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Banners</h1>
        <Button onClick={openNew}>+ New banner</Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title="No banners yet" hint="Create promotional banners for the homepage." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((b) => (
              <Card key={b.id} className="overflow-hidden">
                {b.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.imageUrl} alt={b.title} className="h-36 w-full object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{b.title}</p>
                    <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  {b.subtitle && <p className="mt-1 text-sm text-slate-500">{b.subtitle}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {b.position} · order {b.sortOrder}
                    {b.linkUrl ? ` · links to ${b.linkUrl}` : ""}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => remove(b.id, b.title)}>Delete</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit banner" : "New banner"} wide>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
          <Input label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} hint="e.g. home-hero" />
          <div className="md:col-span-2">
            <Textarea label="Subtitle (optional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} rows={2} />
          </div>
          <Input label="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
          <Input label="Link URL (optional)" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="/search?category=…" />
          <Input label="Sort order" type="number" step="1" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-fusion-600" />
            Active
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <Button loading={saving} onClick={save}>{editing ? "Save changes" : "Create banner"}</Button>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
