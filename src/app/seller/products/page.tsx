import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Badge, EmptyState, Price, RatingStars } from "@/components/ui";
import { SellerNav } from "../SellerNav";
import { requireSellerPage } from "../auth";
import { ProductRowActions } from "./ProductRowActions";

export const metadata = { title: "My Products · ShopFusion" };

function stockTone(stock: number): "success" | "warning" | "danger" | "neutral" {
  if (stock === 0) return "danger";
  if (stock < 10) return "warning";
  return "success";
}

export default async function SellerProductsPage() {
  const { seller } = await requireSellerPage();
  if (!seller) return null;

  const products = await db.product.findMany({
    where: { sellerId: seller.id },
    orderBy: { updatedAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      category: { select: { name: true } },
      _count: { select: { variants: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SellerNav />
      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Products ({products.length})</h1>
        <Link
          href="/seller/products/new"
          className="rounded-xl bg-fusion-600 px-4 py-2 text-sm font-medium text-white hover:bg-fusion-700"
        >
          + Add product
        </Link>
      </div>

      <div className="mt-6">
        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            hint="Create your first product to start selling."
            action={<Link href="/seller/products/new" className="rounded-xl bg-fusion-600 px-4 py-2 text-sm font-medium text-white">Add product</Link>}
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0].url} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
                        )}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.category.name} · {p.sku}{p._count.variants > 0 ? ` · ${p._count.variants} variants` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Price price={Number(p.price)} discountPrice={p.discountPrice ? Number(p.discountPrice) : null} size="sm" /></td>
                    <td className="px-4 py-3">
                      <Badge tone={stockTone(p.stock)}>{p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <RatingStars value={p.avgRating} /> <span className="text-xs text-slate-500">({p.reviewCount})</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Hidden"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ProductRowActions id={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
