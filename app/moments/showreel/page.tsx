import { Suspense } from "react";
import HomePage from "@/components/HomePage";

function HomeFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-page text-sm text-ink-500">
      Loading…
    </div>
  );
}

export default function ShowreelPage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomePage mode="showreel" />
    </Suspense>
  );
}
