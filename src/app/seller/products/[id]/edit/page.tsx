import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SellerNav } from "../../../SellerNav";
import { requireSellerPage } from "../../../auth";
import { ProductForm, type ProductFormData } from "../../ProductForm";

export const metadata = { title: "Edit Product · ShopFusion" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { seller } = await requireSellerPage();
  const { id } = await params;
  if (!seller) notFound(); // admins manage products under /admin

  const p = await db.product.findFirst({
    where: { id, sellerId: seller.id },
    include: { images: { orderBy: { position: "asc" } }, variants: true },
  });
  if (!p) notFound();

  const [categories, brands] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const initial: ProductFormData = {
    name: p.name,
    description: p.description,
    sku: p.sku,
    price: String(p.price),
    discountPrice: p.discountPrice ? String(p.discountPrice) : "",
    stock: String(p.stock),
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    brandId: p.brandId ?? "",
    categoryId: p.categoryId,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    variants: p.variants.map((v) => ({
      name: v.name,
      sku: v.sku,
      price: v.price ? String(v.price) : "",
      stock: String(v.stock),
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SellerNav />
      <h1 className="mt-6 font-display text-2xl font-bold">Edit product</h1>
      <div className="mt-6">
        <ProductForm productId={p.id} categories={categories} brands={brands} initial={initial} />
      </div>
    </div>
  );
}
