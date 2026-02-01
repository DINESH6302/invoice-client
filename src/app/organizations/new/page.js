import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import NewOrgClient from "./NewOrgClient";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-slate-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}

export default function NewOrganizationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewOrgClient />
    </Suspense>
  );
}
