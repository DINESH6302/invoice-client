'use client';

import { usePathname } from 'next/navigation';
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useOrganization } from '@/context/OrganizationContext';

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const { currentOrg } = useOrganization();
  // Check if the current page is the template builder (create or edit detail) or new org setup
  // Full screen for /templates/create and /templates/[id], but not for /templates list
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
  const isTemplateDetail = pathname.startsWith('/templates/') && pathname !== '/templates';
  const isFullScreen = isTemplateDetail || pathname === '/organizations/new' || isAuthPage;

  if (isTemplateDetail) {
      return <main className="h-screen w-full bg-slate-50 overflow-hidden text-slate-900">{children}</main>;
  }

  if (isFullScreen) {
      return <main className="min-h-screen w-full bg-slate-50 text-slate-900">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-56 h-screen">
            <Header />
            <main key={currentOrg?.org_id} className="mt-16 bg-slate-50 flex-1 overflow-y-auto relative">
                {children}
            </main>
        </div>
    </div>
  );
}
