'use client';

import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setTokens, clearTokens } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
        setSuccess('Account successfully created! Please login.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: formData.email,
                password: formData.password
            })
        });
        
        if (response.ok) {
             const data = await response.json();
             setTokens(data.access_token, data.refresh_token);
             router.push('/dashboard');
        } else {
             const text = await response.text();
             let msg = 'Invalid credentials';
             try {
                 const json = JSON.parse(text);
                 if (json.message) msg = json.message;
             } catch(err) {
                 if (text) msg = text;
             }
             setError(msg);
             setLoading(false);
        }
    } catch (err) {
        console.error("Login error", err);
        setError('Network error. Please try again.');
        setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md z-10 p-6">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
                    <p className="text-slate-500">Enter your credentials to access your account</p>
                </div>

                {success && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={16} />
                        {success}
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1" htmlFor="email">Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
                                <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                Login
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                     <button className="flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                           <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                           <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                           <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                           <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span className="text-sm font-medium text-slate-700">Google</span>
                     </button>
                </div>

                <div className="text-center text-sm">
                    <span className="text-slate-500">Don't have an account? </span>
                    <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                        Create account
                    </Link>
                </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-slate-400">
                &copy; {new Date().getFullYear()} BizBill Manager. All rights reserved.
            </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute -top-[30%] -right-[10%] w-[70rem] h-[70rem] rounded-full bg-blue-100/40 blur-3xl" />
            <div className="absolute -bottom-[30%] -left-[10%] w-[70rem] h-[70rem] rounded-full bg-indigo-100/40 blur-3xl" />
        </div>
        
        <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
            <LoginForm />
        </Suspense>
    </div>
  );
}
