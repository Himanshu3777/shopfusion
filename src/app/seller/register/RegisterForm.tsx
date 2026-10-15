"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, useToast } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const { push } = useToast();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/seller/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(logo.trim() ? { logo: logo.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Registration failed");
      push("Application submitted! We'll review it shortly.", "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Store name"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="e.g. TechBazaar"
          required
          maxLength={100}
        />
        <Textarea
          label="Store description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What do you sell? What makes your store special?"
          rows={4}
          maxLength={1000}
        />
        <Input
          label="Logo URL (optional)"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https://…"
          type="url"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} disabled={!storeName.trim()}>
          Submit application
        </Button>
      </form>
    </Card>
  );
}
