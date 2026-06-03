import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { useUIStore } from '@/store/uiStore';
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground focus:ring-2 focus:outline-none">
        Skip to main content
      </a>
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          'lg:ml-[280px]',
          sidebarCollapsed && 'lg:ml-[72px]',
        )}
      >
        <Header onSearch={setSearchQuery} />
        <main id="main-content" className="p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
