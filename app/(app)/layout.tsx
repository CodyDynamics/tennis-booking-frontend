/**
 * Route group (app): không đổi URL. loading.tsx cùng cấp bọc Suspense cho toàn nhánh.
 */
export default function AppRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
