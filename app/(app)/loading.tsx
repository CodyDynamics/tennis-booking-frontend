import { RouteSegmentLoadingBridge } from "@/components/layout/app-loading-provider";

/**
 * Next.js: fallback Suspense khi chuyển trang / stream RSC trong nhóm (app).
 * Bridge báo AppLoadingProvider để hiện TennisBallsLoader (một lớp overlay duy nhất).
 */
export default function AppSegmentLoading() {
  return <RouteSegmentLoadingBridge />;
}
