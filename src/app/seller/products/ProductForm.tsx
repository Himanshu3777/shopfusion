"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, Select, Badge, useToast } from "@/components/ui";

export type CategoryOption = { id: string; name: string };
export type BrandOption = { id: string; name: string };

type ImageRow = { url: string; alt: string };
type VariantRow = { name: string; sku: string; price: string; stock: string };

export type ProductFormData = {
  name: string;
  description: string;
  sku: string;
  price: string;
  discountPrice: string;
  stock: string;
  isActive: boolean;
  isFeatured: boolean;
  brandId: string;
  categoryId: string;
  images: ImageRow[];
  variants: VariantRow[];
};

const EMPTY: ProductFormData = {
  name: "",
  description: "",
  sku: "",
  price: "",
  discountPrice: "",
  stock: "0",
  isActive: true,
  isFeatured: false,
  brandId: "",
  categoryId: "",
  images: [],
  variants: [],
};

export function ProductForm({
  productId,
  categories,
  brands,
  initial,
}: {
  productId?: string;
  categories: CategoryOption[];
  brands: BrandOption[];
  initial?: ProductFormData;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState<ProductFormData>(initial ?? EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function updateImage(i: number, patch: Partial<ImageRow>) {
    set("images", form.images.map((img, j) => (j === i ? { ...img, ...patch } : img)));
  }
  function updateVariant(i: number, patch: Partial<VariantRow>) {
    set("variants", form.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.categoryId) {
      setError("Please choose a category.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        sku: form.sku.trim(),
        price: Number(form.price),
        ...(form.discountPrice.trim() ? { discountPrice: Number(form.discountPrice) } : {}),
        stock: Number(form.stock),
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        ...(form.brandId ? { brandId: form.brandId } : {}),
        categoryId: form.categoryId,
        images: form.images.filter((i) => i.url.trim()).map((i) => ({ url: i.url.trim(), alt: i.alt.trim() || undefined })),
        variants: form.variants
          .filter((v) => v.name.trim() && v.sku.trim())
          .map((v) => ({
            name: v.name.trim(),
            sku: v.sku.trim(),
            ...(v.price.trim() ? { price: Number(v.price) } : {}),
            stock: Number(v.stock || 0),
          })),
      };
      const res = await fetch(
        productId ? `/api/seller/products/${productId}` : "/api/seller/products",
        {
          method: productId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Save failed");
      push(productId ? "Product updated" : "Product created", "success");
      router.push("/seller/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Basic details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Product name" value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={200} />
          <Input label="SKU" value={form.sku} onChange={(e) => set("sku", e.target.value)} required maxLength={100} hint="Unique across the platform" />
          <div className="md:col-span-2">
            <Textarea label="Description" value={form.description} onChange={(e) => set("description", e.target.value)} required rows={4} />
          </div>
          <Input label="Price (₹)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} required />
          <Input label="Discount price (₹, optional)" type="number" min="0" step="0.01" value={form.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} />
          <Input label="Stock" type="number" min="0" step="1" value={form.stock} onChange={(e) => set("stock", e.target.value)} required />
          <Select label="Category" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select label="Brand (optional)" value={form.brandId} onChange={(e) => set("brandId", e.target.value)}>
            <option value="">No brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-fusion-600" />
            Active (visible to shoppers)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="h-4 w-4 accent-fusion-600" />
            Featured
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Images</h2>
          <Button type="button" variant="secondary" size="sm" onClick={() => set("images", [...form.images, { url: "", alt: "" }])}>
            + Add image
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {form.images.length === 0 && <p className="text-sm text-slate-500">No images yet.</p>}
          {form.images.map((img, i) => (
            <div key={i} className="flex items-center gap-3">
              <Badge>{i + 1}</Badge>
              <Input placeholder="https://…" value={img.url} onChange={(e) => updateImage(i, { url: e.target.value })} className="flex-1" />
              <Input placeholder="Alt text" value={img.alt} onChange={(e) => updateImage(i, { alt: e.target.value })} />
              <Button type="button" variant="ghost" size="sm" onClick={() => set("images", form.images.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Variants</h2>
          <Button type="button" variant="secondary" size="sm" onClick={() => set("variants", [...form.variants, { name: "", sku: "", price: "", stock: "0" }])}>
            + Add variant
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {form.variants.length === 0 && <p className="text-sm text-slate-500">No variants. Add e.g. size or storage options.</p>}
          {form.variants.map((v, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-5">
              <Input label="Name" placeholder="128 GB" value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} />
              <Input label="SKU" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
              <Input label="Price ₹ (optional)" type="number" min="0" step="0.01" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} />
              <Input label="Stock" type="number" min="0" step="1" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} />
              <div className="flex items-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" loading={loading}>{productId ? "Save changes" : "Create product"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/seller/products")}>Cancel</Button>
      </div>
    </form>
  );
}
