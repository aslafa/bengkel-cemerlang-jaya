import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton({ jumlahKartu = 6 }: { jumlahKartu?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header & Filter Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-12 w-full sm:w-96 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div
        className={`grid grid-cols-2 ${
          jumlahKartu > 4 ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-2 lg:grid-cols-4"
        } gap-4`}
      >
        {Array.from({ length: jumlahKartu }).map((_, i) => (
          <Card key={i} className="bg-bg-panel border-border shadow-card p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="size-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-28 rounded" />
            <Skeleton className="h-3 w-24 rounded pt-2" />
          </Card>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-bg-panel border-border shadow-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>

        <Card className="bg-bg-panel border-border shadow-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>
      </div>

      {/* Secondary Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-bg-panel border-border shadow-card p-5 space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>
        <Card className="bg-bg-panel border-border shadow-card p-5 space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>
      </div>
    </div>
  );
}
