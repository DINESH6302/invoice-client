'use client';


import { User, ChevronDown, Plus, LogOut, Settings, Pencil, Trash2, X } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api';

export default function Header() {
    const { currentOrg, switchOrganization, setOrganizations } = useOrganization();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [orgNames, setOrgNames] = useState([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, orgId: null, orgName: '' });
    const [deleteStatus, setDeleteStatus] = useState({ type: null, message: '' });
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

    // Fetch org names on component mount
    useEffect(() => {
        fetchOrgNames();
    }, []);

    // Auto-close delete status notification after 3 seconds
    useEffect(() => {
        if (deleteStatus.type) {
            const timer = setTimeout(() => {
                setDeleteStatus({ type: null, message: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteStatus.type]);

    // Fetch org names
    const fetchOrgNames = useCallback(async () => {
        setLoadingOrgs(true);
        try {
            const res = await apiFetch('/orgs/summary', { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                // Data should be array like [{ org_id: "20", org_name: "ECOM" }, ...]
                const orgList = Array.isArray(data) ? data : data.data || [];
                setOrgNames(orgList);
                // Also store in context
                if (setOrganizations && orgList.length > 0) {
                    setOrganizations(orgList);
                    // Set first org as current if none is selected
                    if (!currentOrg && orgList.length > 0) {
                        switchOrganization(orgList[0].org_id);
                    }
                }
            } else {
                setOrgNames([]);
            }
        } catch (e) {
            console.error("Error fetching org summary:", e);
            setOrgNames([]);
        }
        setLoadingOrgs(false);
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

  const handleDeleteOrg = async () => {
      try {
          const res = await apiFetch(`/orgs/${deleteConfirm.orgId}`, { method: 'DELETE' });
          
          if (res.status === 204 || res.ok) {
              // Remove from local state
              const updatedOrgs = orgNames.filter(org => org.org_id !== deleteConfirm.orgId);
              setOrgNames(updatedOrgs);
              setOrganizations(updatedOrgs);
              
              // Reset current org if deleted org was selected
              if (currentOrg?.org_id === deleteConfirm.orgId) {
                  if (updatedOrgs.length > 0) {
                      switchOrganization(updatedOrgs[0].org_id);
                  }
              }
              
              setDeleteStatus({ type: 'success', message: 'Organization deleted successfully.' });
              setDeleteConfirm({ open: false, orgId: null, orgName: '' });
              setIsDropdownOpen(false);
          } else {
              let errorMsg = 'Failed to delete organization.';
              try {
                  const data = await res.json();
                  errorMsg = data.message || data.error || errorMsg;
              } catch (e) {
                  errorMsg = res.statusText || errorMsg;
              }
              setDeleteStatus({ type: 'error', message: errorMsg });
          }
      } catch (err) {
          setDeleteStatus({ type: 'error', message: err.message || 'Failed to delete organization.' });
      }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed top-0 right-0 left-56 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Breadcrumb or Title could go here */}
      </div>

      <div className="flex items-center gap-6">
        {/* Organization Switcher */}
        {orgNames.length > 0 ? (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200"
            >
              {currentOrg?.org_name || currentOrg?.name || "Select Organization"}
              <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}/>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-slate-100 rounded-md shadow-lg border border-slate-100 py-1 z-50">
                {orgNames.map((org, idx) => {
                  const orgId = org.org_id;
                  const orgName = org.org_name;
                  const isSelected = currentOrg?.org_id === orgId || currentOrg?.id === orgId;
                  return (
                    <div key={orgId || idx} className="flex items-center hover:bg-slate-50 group">
                      <button
                        onClick={() => {
                          switchOrganization(orgId);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex-1 text-left px-4 py-2 text-sm ${isSelected ? 'text-blue-600 font-medium' : 'text-slate-600'}`}
                      >
                        {orgName}
                      </button>
                      <button
                        onClick={() => {
                          router.push(`/organizations/new?id=${orgId}`);
                          setIsDropdownOpen(false);
                        }}
                        className="px-3 py-2 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit organization"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, orgId, orgName })}
                        className="px-3 py-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete organization"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
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
        ) : (
          <button
            onClick={() => router.push('/organizations/new')}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-4 py-1.5 rounded-md border border-blue-200"
          >
            <Plus size={14} />
            Create Organization
          </button>
        )}
        
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 relative" ref={profileDropdownRef}>
            <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors outline-none"
            >
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-700">Dinesh</p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200">
                    <User size={20} />
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}/>
            </button>

                        {isProfileOpen && (
                                 <div className="absolute top-full right-0 w-36 bg-slate-50 rounded-md shadow-lg border border-slate-100 py-1 z-50">
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 border border-slate-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Delete Organization?</h3>
              <p className="text-slate-600 text-sm mt-2">
                Are you sure you want to delete <span className="font-medium">{deleteConfirm.orgName}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, orgId: null, orgName: '' })}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrg}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success/Error Notification */}
      {deleteStatus.type && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg p-4 shadow-lg max-w-md border flex items-start gap-3 ${
          deleteStatus.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`flex-1 text-sm font-medium ${
            deleteStatus.type === 'success' 
              ? 'text-emerald-900' 
              : 'text-red-900'
          }`}>
            {deleteStatus.message}
          </p>
          <button
            onClick={() => setDeleteStatus({ type: null, message: '' })}
            className={`flex-shrink-0 transition-colors ${
              deleteStatus.type === 'success'
                ? 'text-emerald-600 hover:text-emerald-700'
                : 'text-red-600 hover:text-red-700'
            }`}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </header>
  );
}