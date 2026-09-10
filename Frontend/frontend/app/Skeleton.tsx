export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[#1a1a24] rounded animate-pulse ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[#13131a] border border-white/8 rounded-xl p-4">
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-2 w-48" />
    </div>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="bg-[#13131a] border border-white/8 rounded-xl p-4">
      <Skeleton className="h-2 w-20 mb-3" />
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-1 w-full mb-3" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
