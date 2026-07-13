import CircularLoader from "@/components/CircularLoader";

export default function Loading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center space-y-4">
      <CircularLoader />
      <span className="text-sm font-bold text-slate-500 animate-pulse">جاري تحميل البيانات...</span>
    </div>
  );
}
