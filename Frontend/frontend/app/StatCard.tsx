interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  sub: string;
}

export function StatCard({ label, value, color, sub }: StatCardProps) {
  return (
    <div className="bg-[#13131a] border border-white/8 rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
        {label}
      </div>
      <div className={`text-2xl font-medium ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-600 mt-1">{sub}</div>
    </div>
  );
}
