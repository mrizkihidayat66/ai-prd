'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings2, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { CommandPalette } from '@/components/common/command-palette';
import { SettingsDialog } from '@/features/settings/components/settings-dialog';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setSidebarCollapsed(stored === 'true');
    }
  }, []);

  // Persist sidebar state
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  // Sidebar content (reused for desktop + mobile)
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div id={mobile ? 'sidebar-mobile-content' : 'sidebar-desktop-content'} className="sidebar-content flex flex-col h-full">
      {/* Branding */}
      <div id="sidebar-branding" className={cn(
        'sidebar-branding flex items-center gap-2.5 px-4 py-4 border-b border-border',
        sidebarCollapsed && !mobile && 'justify-center px-2'
      )}>
        <div className="sidebar-logo w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="sidebar-logo-text text-primary-foreground text-xs font-bold">AI</span>
        </div>
        {(!sidebarCollapsed || mobile) && (
          <span className="sidebar-title text-sm font-semibold text-foreground tracking-tight">AI-PRD</span>
        )}
      </div>

      {/* Nav links */}
      <nav id="sidebar-nav" className={cn('sidebar-nav flex-1 px-2 py-3 space-y-0.5', sidebarCollapsed && !mobile && 'px-1')}>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            id={`nav-link-${label.toLowerCase()}`}
            onClick={() => mobile && setMobileOpen(false)}
            className={cn(
              'nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              sidebarCollapsed && !mobile && 'justify-center px-2'
            )}
          >
            <Icon className="nav-item-icon w-4 h-4 shrink-0" />
            {(!sidebarCollapsed || mobile) && label}
          </Link>
        ))}
      </nav>

      {/* Footer: settings + theme toggle */}
      <div id="sidebar-footer" className={cn('sidebar-footer px-2 py-3 border-t border-border space-y-1', sidebarCollapsed && !mobile && 'px-1')}>
        <ThemeToggle collapsed={sidebarCollapsed} mobile={mobile} />
        <button
          type="button"
          name="settings-toggle"
          onClick={() => {
            setSettingsOpen(true);
            if (mobile) setMobileOpen(false);
          }}
          className={cn(
            'sidebar-settings-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            sidebarCollapsed && !mobile && 'justify-center px-2'
          )}
        >
          <Settings2 className="sidebar-settings-icon w-4 h-4 shrink-0" />
          {(!sidebarCollapsed || mobile) && 'Settings'}
        </button>
      </div>
    </div>
  );

  return (
    <div id="app-shell" className="app-shell flex h-full min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        id="sidebar-desktop"
        className={cn(
          'sidebar-desktop hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar transition-all duration-300 relative',
          sidebarCollapsed ? 'w-14' : 'w-56'
        )}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          name="sidebar-collapse-toggle"
          onClick={toggleSidebar}
          className="sidebar-collapse-btn absolute top-4 -right-3 z-10 w-6 h-6 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* Mobile Header + Drawer */}
      <div id="mobile-header" className="mobile-header md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border bg-background px-4 py-3 flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger>
            <Button variant="ghost" size="sm" name="mobile-menu-toggle" className="mobile-menu-btn h-8 w-8 p-0">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sidebar-mobile-drawer w-56 p-0">
            <SidebarContent mobile />
          </SheetContent>
        </Sheet>
        <div className="mobile-branding flex items-center gap-2">
          <div className="mobile-logo w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <span className="mobile-logo-text text-primary-foreground text-[10px] font-bold">AI</span>
          </div>
          <span className="mobile-title text-sm font-semibold">AI-PRD</span>
        </div>
      </div>

      {/* Main content */}
      <main id="main-content" className="main-content flex-1 min-w-0 overflow-y-auto overflow-x-hidden md:mt-0 mt-14 relative">
        {children}
      </main>

      <CommandPalette />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
