import { RouteSegmentLoadingBridge } from "@/components/layout/app-loading-provider";

/**
 * Next.js segment loading: Suspense fallback while navigating / streaming RSC.
 * Bridge notifies AppLoadingProvider to show the global tennis overlay.
 */
export default function AppSegmentLoading() {
  return <RouteSegmentLoadingBridge />;
}
