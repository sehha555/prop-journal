import { Suspense } from "react";
import TradesView from "./TradesView";

export default function TradesPage() {
  // useSearchParams 在靜態匯出下要包 Suspense
  return (
    <Suspense fallback={null}>
      <TradesView />
    </Suspense>
  );
}
