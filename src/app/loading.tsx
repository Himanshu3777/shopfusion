import { HeroSkeleton, CategorySkeleton, ProductGridSkeleton } from "@/components/HomeSkeletons";

export default function HomeLoading() {
  return (
    <div aria-busy="true" aria-label="Loading homepage">
      <HeroSkeleton />
      <CategorySkeleton />
      <ProductGridSkeleton />
    </div>
  );
}
