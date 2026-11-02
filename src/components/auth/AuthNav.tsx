'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, LayoutDashboard, LogIn, ChevronDown } from 'lucide-react';

interface AuthUserState {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  activeOrg: {
    id: string;
    name: string;
    slug: string;
    role: string;
  } | null;
}

export function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setMenuOpen(false);
      router.push('/');
      router.refresh();
    } catch (e) {
      console.warn('Logout failed:', e);
    }
  };

  if (loading) {
    return <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />;
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Link
          href="/login"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs"
        >
          <span>Register</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
          {user.fullName ? user.fullName[0].toUpperCase() : user.email[0].toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-bold text-slate-800 leading-tight">
            {user.fullName || user.email.split('@')[0]}
          </p>
          <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
            {user.activeOrg?.name || 'Workspace'}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn text-xs">
          <div className="px-3.5 py-2 border-b border-slate-100">
            <p className="font-semibold text-slate-800">{user.fullName || 'User'}</p>
            <p className="text-slate-500 text-[11px] truncate">{user.email}</p>
            {user.activeOrg && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                {user.activeOrg.name} ({user.activeOrg.role})
              </span>
            )}
          </div>

          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center space-x-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <span>Creator Dashboard</span>
          </Link>

          <Link
            href="/builder"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center space-x-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>Studio Builder</span>
          </Link>

          <div className="border-t border-slate-100 my-1" />

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3.5 py-2 text-red-600 hover:bg-red-50 font-medium transition-colors text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
