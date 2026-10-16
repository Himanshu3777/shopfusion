import { ProductGridSkeleton } from "@/components/HomeSkeletons";

export default function ProductsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading products" className="pt-4">
      <ProductGridSkeleton titleWidth="w-52" />
    </div>
  );
}
