"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Select, Badge, EmptyState, Loading, Pagination, useToast } from "@/components/ui";
import { AdminNav } from "../AdminNav";
import { api, type Paginated } from "../api";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  isBanned: boolean;
  createdAt: string;
  _count: { orders: number };
};

const ROLES = ["ALL", "CUSTOMER", "SELLER", "ADMIN"] as const;

export default function AdminUsersPage() {
  const { push } = useToast();
  const [data, setData] = useState<Paginated<UserRow> | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (q.trim()) sp.set("q", q.trim());
      if (role !== "ALL") sp.set("role", role);
      setData(await api<Paginated<UserRow>>(`/api/admin/users?${sp}`));
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, q, role, push]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  function search() {
    setPage(1);
    load();
  }

  async function updateUser(id: string, patch: { role?: string; isBanned?: boolean }) {
    try {
      await api(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      push("User updated", "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Update failed", "error");
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE" });
      push("User deleted", "success");
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AdminNav />
      <h1 className="mt-6 font-display text-2xl font-bold">Users</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        </div>
        <div className="w-44">
          <Select value={role} onChange={(e) => { setRole(e.target.value as typeof role); setPage(1); }}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r === "ALL" ? "All roles" : r}</option>
            ))}
          </Select>
        </div>
        <Button onClick={search}>Search</Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Orders</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.name ?? "—"}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={u.role}
                          onChange={(e) => updateUser(u.id, { role: e.target.value })}
                          aria-label={`Role for ${u.email}`}
                        >
                          {["CUSTOMER", "SELLER", "ADMIN"].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">{u._count.orders}</td>
                      <td className="px-4 py-3">
                        <Badge tone={u.isBanned ? "danger" : "success"}>{u.isBanned ? "Banned" : "Active"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateUser(u.id, { isBanned: !u.isBanned })}
                          >
                            {u.isBanned ? "Unban" : "Ban"}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => deleteUser(u.id, u.email)}>
                            Delete
                          </Button>
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
    </div>
  );
}
