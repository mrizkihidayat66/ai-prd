import { Skeleton } from '@/components/ui/skeleton';

export function PrdViewerSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* Sections */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}

      {/* Diagram placeholder */}
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export function VersionSelectorSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
    </div>
  );
}
