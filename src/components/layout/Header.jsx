'use client';


import { User, ChevronDown, Plus, LogOut, Settings } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api';

export default function Header() {
  const { currentOrg, organizations, switchOrganization } = useOrganization();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
      try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
              method: 'POST',
              credentials: 'include'
          });
      } catch (e) {
          console.error("Logout failed", e);
      } finally {
          clearTokens();
          router.push('/login');
      }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed top-0 right-0 left-56 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Breadcrumb or Title could go here */}
      </div>

      <div className="flex items-center gap-6">
        {/* Organization Switcher */}
        <div className="relative" ref={dropdownRef}>
             <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200"
             >
                 {currentOrg?.name}
                 <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}/>
             </button>
             
             {isDropdownOpen && (
                 <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-100 py-1 z-50">
                     {organizations.map(org => (
                         <button
                             key={org.id}
                             onClick={() => {
                                 switchOrganization(org.id);
                                 setIsDropdownOpen(false);
                             }}
                             className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${currentOrg.id === org.id ? 'text-blue-600 font-medium' : 'text-slate-600'}`}
                         >
                             {org.name}
                         </button>
                     ))}
                     <div className="border-t border-slate-100 my-1"></div>
                     <button
                         onClick={() => {
                             router.push('/organizations/new');
                             setIsDropdownOpen(false);
                         }}
                         className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-slate-50 flex items-center gap-2"
                     >
                         <Plus size={14} />
                        New Organization
                     </button>
                 </div>
             )}
        </div>
        
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 relative" ref={profileDropdownRef}>
            <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors outline-none"
            >
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-700">Dinesh</p>
                    <p className="text-xs text-slate-500">Admin</p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200">
                    <User size={20} />
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}/>
            </button>

                        {isProfileOpen && (
                                 <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-100 py-1 z-50">
                                         <button
                                                 onClick={() => {
                                                         // router.push('/settings');
                                                         setIsProfileOpen(false);
                                                 }}
                                                 className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                         >
                                                 <Settings size={16} />
                                                 Settings
                                         </button>
                                         <div className="border-t border-slate-100 my-1"></div>
                                         <button
                                                 onClick={() => setShowLogoutConfirm(true)}
                                                 className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                         >
                                                 <LogOut size={16} />
                                                 Logout
                                         </button>
                                 </div>
                         )}

                        {/* Logout Confirmation Modal */}
                        {showLogoutConfirm && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xs border border-slate-200 animate-in fade-in">
                                        <div className="mb-4 text-center">
                                            <div className="text-lg font-semibold mb-2">Confirm Logout</div>
                                            <div className="text-slate-600 text-sm">Are you sure you want to logout?</div>
                                        </div>
                                        <div className="flex gap-3 mt-6">
                                            <button
                                                className="flex-1 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                                                onClick={() => setShowLogoutConfirm(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="flex-1 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold"
                                                onClick={() => {
                                                    setShowLogoutConfirm(false);
                                                    setIsProfileOpen(false);
                                                    handleLogout();
                                                }}
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                        )}
        </div>
      </div>
    </header>
  );
}
