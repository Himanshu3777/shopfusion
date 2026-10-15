"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Input,
  Badge,
  Loading,
  Spinner,
  Modal,
  EmptyState,
  useToast,
} from "@/components/ui";

type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok)
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return json.data as T;
}

const emptyAddress = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

export default function DashboardClient() {
  const { push } = useToast();
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, wishlist, addr] = await Promise.all([
        api<{ total: number }>("/api/orders?limit=1"),
        api<{ items: unknown[] }>("/api/wishlist"),
        api<{ items: Address[] }>("/api/addresses"),
      ]);
      setOrdersCount(orders.total);
      setWishlistCount(wishlist.items.length);
      setAddresses(addr.items);
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyAddress);
    setShowForm(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    setForm({
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      isDefault: a.isDefault,
    });
    setShowForm(true);
  };

  const saveAddress = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/addresses/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        push("Address updated", "success");
      } else {
        await api("/api/addresses", { method: "POST", body: JSON.stringify(form) });
        push("Address added", "success");
      }
      const d = await api<{ items: Address[] }>("/api/addresses");
      setAddresses(d.items);
      setShowForm(false);
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to save address", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    setBusyId(id);
    try {
      await api(`/api/addresses/${id}`, { method: "DELETE" });
      const d = await api<{ items: Address[] }>("/api/addresses");
      setAddresses(d.items);
      push("Address deleted", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to delete address", "error");
    } finally {
      setBusyId(null);
    }
  };

  const setDefault = async (id: string) => {
    setBusyId(id);
    try {
      await api(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) });
      const d = await api<{ items: Address[] }>("/api/addresses");
      setAddresses(d.items);
      push("Default address updated", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to update default", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading dashboard…" />;

  return (
    <div className="space-y-8">
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/orders">
          <Card className="p-5 transition hover:shadow-md">
            <div className="text-3xl font-bold text-fusion-600">{ordersCount ?? "—"}</div>
            <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Orders placed</div>
          </Card>
        </Link>
        <Link href="/wishlist">
          <Card className="p-5 transition hover:shadow-md">
            <div className="text-3xl font-bold text-fusion-600">{wishlistCount ?? "—"}</div>
            <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Wishlist items</div>
          </Card>
        </Link>
        <Link href="/cart">
          <Card className="p-5 transition hover:shadow-md">
            <div className="text-3xl">🛒</div>
            <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Go to cart</div>
          </Card>
        </Link>
        <Link href="/profile">
          <Card className="p-5 transition hover:shadow-md">
            <div className="text-3xl">⚙️</div>
            <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Account settings</div>
          </Card>
        </Link>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/orders"><Button variant="secondary">Order history</Button></Link>
        <Link href="/wishlist"><Button variant="secondary">Wishlist</Button></Link>
        <Link href="/cart"><Button variant="secondary">Cart</Button></Link>
        <Link href="/checkout"><Button variant="secondary">Checkout</Button></Link>
      </div>

      {/* Address manager */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My addresses</h2>
          <Button size="sm" onClick={openAdd}>+ Add address</Button>
        </div>
        {addresses.length === 0 ? (
          <EmptyState
            title="No saved addresses"
            hint="Add a delivery address to speed up checkout."
            action={<Button onClick={openAdd}>Add address</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {a.fullName} <Badge tone="neutral">{a.label}</Badge>
                      {a.isDefault && <Badge tone="brand" className="ml-1">Default</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postalCode}
                    </p>
                    <p className="text-sm text-slate-500">{a.phone}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(a)}>Edit</Button>
                  {!a.isDefault && (
                    <Button size="sm" variant="secondary" disabled={busyId === a.id} onClick={() => setDefault(a.id)}>
                      Set default
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" disabled={busyId === a.id} onClick={() => deleteAddress(a.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Account settings */}
      <Card className="flex items-center justify-between p-5">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Account settings</h2>
          <p className="text-sm text-slate-500">Update your name, email, password and preferences.</p>
        </div>
        <Link href="/profile">
          <Button>Manage account</Button>
        </Link>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit address" : "Add address"} wide>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <Input label="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required className="md:col-span-2" />
          <Input label="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="md:col-span-2" />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
          <Input label="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Set as default address
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={saveAddress} disabled={saving}>
            {saving ? <Spinner size="sm" /> : editing ? "Save changes" : "Add address"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
