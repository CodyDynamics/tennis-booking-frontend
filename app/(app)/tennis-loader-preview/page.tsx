import { TennisBallsLoaderDemo } from "@/components/ui/tennis-balls-loader";

/** Xóa route này khi không cần preview. */
export default function TennisLoaderPreviewPage() {
  return (
    <main className="min-h-screen bg-background">
      <TennisBallsLoaderDemo />
    </main>
  );
}
