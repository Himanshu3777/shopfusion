import { db } from "@/lib/db";
import { SellerNav } from "../../SellerNav";
import { requireSellerPage } from "../../auth";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "Add Product · ShopFusion" };

export default async function NewProductPage() {
  await requireSellerPage();

  const [categories, brands] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SellerNav />
      <h1 className="mt-6 font-display text-2xl font-bold">Add a product</h1>
      <div className="mt-6">
        <ProductForm categories={categories} brands={brands} />
      </div>
    </div>
  );
}
