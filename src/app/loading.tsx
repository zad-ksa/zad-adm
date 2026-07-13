import CircularLoader from "@/components/CircularLoader";

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
      <CircularLoader />
    </div>
  );
}
