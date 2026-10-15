"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Textarea, Select, Badge, Modal, EmptyState, Loading, useToast } from "@/components/ui";
import { AdminNav } from "../AdminNav";

/**
 * Category management UI. Talks to Worker 2's /api/categories REST API
 * (same { ok, data } envelope; list is either an array or a paginated { items } object).
 */
type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string } };

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!json?.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return json.data as T;
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

const EMPTY = { name: "", description: "", image: "", parentId: "", isActive: true, sortOrder: "0" };

export default function AdminCategoriesPage() {
  const { push } = useToast();
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<unknown>("/api/categories?limit=200");
      setItems(asArray<CategoryRow>(data));
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  function openNew(parentId = "") {
    setEditing(null);
    setForm({ ...EMPTY, parentId });
    setModalOpen(true);
  }
  function openEdit(c: CategoryRow) {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description ?? "",
      image: c.image ?? "",
      parentId: c.parentId ?? "",
      isActive: c.isActive,
      sortOrder: String(c.sortOrder),
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      push("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(form.image.trim() ? { image: form.image.trim() } : {}),
        ...(form.parentId ? { parentId: form.parentId } : {}),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder || 0),
      };
      await api(editing ? `/api/categories/${editing.id}` : "/api/categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      push(editing ? "Category updated" : "Category created", "success");
      setModalOpen(false);
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Its children will be detached.`)) return;
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      push("Category deleted", "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  async function toggleActive(c: CategoryRow) {
    try {
      await api(`/api/categories/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Update failed", "error");
    }
  }

  const roots = items.filter((c) => !c.parentId);
  const childrenOf = (id: string) => items.filter((c) => c.parentId === id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Categories</h1>
        <Button onClick={() => openNew()}>+ New category</Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title="No categories yet" hint="Create the category tree used across the storefront." />
        ) : (
          <div className="flex flex-col gap-3">
            {roots.map((root) => (
              <Card key={root.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{root.name}</p>
                      <Badge tone={root.isActive ? "success" : "neutral"}>{root.isActive ? "Active" : "Hidden"}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">/{root.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openNew(root.id)}>+ Child</Button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(root)}>Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleActive(root)}>
                      {root.isActive ? "Hide" : "Show"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(root.id, root.name)}>Delete</Button>
                  </div>
                </div>
                {childrenOf(root.id).length > 0 && (
                  <div className="mt-4 ml-4 flex flex-col gap-2 border-l-2 border-slate-100 pl-4 dark:border-slate-800">
                    {childrenOf(root.id).map((child) => (
                      <div key={child.id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{child.name}</p>
                          <Badge tone={child.isActive ? "success" : "neutral"}>{child.isActive ? "Active" : "Hidden"}</Badge>
                          <span className="text-xs text-slate-400">/{child.slug}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(child)}>Edit</Button>
                          <Button size="sm" variant="secondary" onClick={() => toggleActive(child)}>
                            {child.isActive ? "Hide" : "Show"}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => remove(child.id, child.name)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit category" : "New category"}>
        <div className="flex flex-col gap-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
          <Textarea label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <Input label="Image URL (optional)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" />
          <Select label="Parent category" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
            <option value="">None (top-level)</option>
            {items.filter((c) => c.id !== editing?.id).map((c) => (
              <option key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>
            ))}
          </Select>
          <Input label="Sort order" type="number" step="1" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-fusion-600" />
            Active
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <Button loading={saving} onClick={save}>{editing ? "Save changes" : "Create category"}</Button>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
