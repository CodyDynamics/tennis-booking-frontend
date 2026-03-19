import { TennisBallsLoaderDemo } from "@/components/ui/tennis-balls-loader";
import { TennisBallsLoader2Demo } from "@/components/ui/tennis-balls-loader-2";

/** Remove this route when you no longer need local previews. */
export default function TennisLoaderPreviewPage() {
  return (
    <main className="min-h-screen space-y-16 bg-background py-12">
      {/* <TennisBallsLoaderDemo /> */}
      <hr className="mx-auto max-w-lg border-border" />
      <TennisBallsLoader2Demo />
    </main>
  );
}
