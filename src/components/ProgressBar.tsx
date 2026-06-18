interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100) || 0;

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-semibold text-slate-600">
          التقدم: {current} من {total}
        </span>
        <span className="text-sm font-bold text-primary">{percentage}%</span>
      </div>
      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full relative overflow-hidden"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
        </div>
      </div>
    </div>
  );
}
