import CircularLoader from "@/components/CircularLoader";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <CircularLoader />
    </div>
  );
}
