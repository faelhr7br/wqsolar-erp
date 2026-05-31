'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sun, 
  LayoutDashboard, 
  HardHat, 
  DollarSign, 
  Users, 
  Calendar, 
  LogOut, 
  Menu, 
  X,
  User
} from 'lucide-react';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ nome: string; role: string; email: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Auth validation check
    const token = localStorage.getItem('wqsolar_token');
    const storedUser = localStorage.getItem('wqsolar_user');
    
    if (!token && pathname !== '/login') {
      router.push('/login');
    } else if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('wqsolar_token');
    localStorage.removeItem('wqsolar_user');
    router.push('/login');
  };

  if (!mounted) {
    return (
      <html lang="pt-BR" className="dark">
        <head>
          <title>WQ Solar - ERP</title>
          <meta name="description" content="Gestão Solar Operacional e Financeira Premium" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className="bg-background text-foreground font-sans">
          <div className="flex h-screen items-center justify-center bg-background">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solar-violet border-t-transparent"></div>
          </div>
        </body>
      </html>
    );
  }

  // If on login, do not wrap in Sidebar layout
  if (pathname === '/login') {
    return (
      <html lang="pt-BR" className="dark">
        <head>
          <title>WQ Solar - Login</title>
          <meta name="description" content="Gestão Solar Operacional e Financeira Premium" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className="bg-background text-foreground font-sans">{children}</body>
      </html>
    );
  }

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Obras', path: '/obras', icon: HardHat },
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
    { name: 'Sócios', path: '/socios', icon: Users },
    { name: 'Calendário', path: '/calendario', icon: Calendar },
  ];

  return (
    <html lang="pt-BR" className="dark">
      <head>
        <title>WQ Solar - ERP</title>
        <meta name="description" content="Gestão Solar Operacional e Financeira Premium" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-foreground font-sans overflow-x-hidden">
        <div className="flex min-h-screen bg-background">
          
          {/* DESKTOP SIDEBAR */}
          <aside className="hidden md:flex flex-col w-64 border-r border-card-border bg-[#09090b] p-6 justify-between shrink-0">
            <div className="space-y-8">
              {/* Brand Header */}
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-solar-violet/10 rounded-lg border border-solar-violet/20">
                  <Sun className="h-6 w-6 text-solar-violet animate-pulse" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-zinc-100 tracking-tight leading-none">WQ Solar</h1>
                  <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">ERP OPERACIONAL</span>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => router.push(item.path)}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive 
                          ? 'bg-solar-violet text-white font-semibold shadow-md shadow-solar-violet/10' 
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Partner Footer profile & Logout */}
            <div className="pt-6 border-t border-card-border space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User className="h-4 w-4 text-zinc-300" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{user?.nome || 'Rafael'}</p>
                  <p className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">{user?.role === 'PARTNER' ? 'SÓCIO' : 'ADMIN'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all duration-150 border border-transparent hover:border-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Sair da Conta
              </button>
            </div>
          </aside>

          {/* MOBILE NAVIGATION OVERLAY DRAWER */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
              
              <aside className="relative flex flex-col w-72 bg-[#0d0d0f] p-6 justify-between h-full border-r border-card-border z-10 animate-slide-in">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sun className="h-6 w-6 text-solar-violet" />
                      <div>
                        <h1 className="font-bold text-lg text-zinc-100">WQ Solar</h1>
                        <span className="text-[10px] text-zinc-500 font-semibold tracking-wider">ERP</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)} 
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <nav className="space-y-1">
                    {menuItems.map((item) => {
                      const isActive = pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            router.push(item.path);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            isActive 
                              ? 'bg-solar-violet text-white font-semibold' 
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-6 border-t border-card-border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="h-4 w-4 text-zinc-300" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">{user?.nome || 'Rafael'}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{user?.role === 'PARTNER' ? 'SÓCIO' : 'ADMIN'}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/5 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair da Conta
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* MAIN PAGE SHELL CONTENT */}
          <div className="flex flex-col flex-1 min-w-0 bg-[#09090b]">
            
            {/* MOBILE HEADER BAR */}
            <header className="flex md:hidden items-center justify-between px-6 py-4 border-b border-card-border bg-[#09090b]/80 backdrop-blur sticky top-0 z-40">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-solar-violet animate-pulse" />
                <span className="font-bold text-sm text-zinc-200 tracking-tight">WQ Solar</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              >
                <Menu className="h-5 w-5" />
              </button>
            </header>

            {/* DYNAMIC SCROLL CONTAINER */}
            <main className="flex-1 overflow-y-auto px-6 py-8 md:p-10 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>

        </div>
      </body>
    </html>
  );
}
