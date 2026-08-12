'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Shield, AlertTriangle, CheckSquare,
  FileText, Bot, Settings, ChevronLeft, ChevronRight,
  LogOut, Building2, Users, CreditCard, Puzzle,
  ChevronDown, ClipboardList, Lock, Sparkles, FileWarning,
} from 'lucide-react';
import { Badge } from '@/components/ui/index';
import { createClient } from '@/lib/supabase/client';
import { NotificationsBell } from '@/components/dashboard/NotificationsBell';
import type { Profile, Organisation } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/policies',   label: 'Policies',         icon: FileText        },
  { href: '/risks',      label: 'Risk Register',    icon: AlertTriangle   },
  { href: '/compliance', label: 'Compliance',       icon: CheckSquare     },
  { href: '/audit',      label: 'Audit & Evidence', icon: ClipboardList   },
  { href: '/ask',        label: 'Ask AuditPilot',   icon: Sparkles        },
  { href: '/findings',   label: 'Findings',         icon: FileWarning     },
  { href: '/ai-tools',   label: 'AI Tools',         icon: Bot             },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: '/settings/team',         label: 'Team',         icon: Users      },
  { href: '/settings/billing',      label: 'Billing',      icon: CreditCard },
  { href: '/settings/integrations', label: 'Integrations', icon: Puzzle     },
];

interface SidebarProps {
  profile: Profile | null;
  organisation: Organisation | null;
  unreadCount?: number;
}

export function Sidebar({ profile, organisation, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith('/settings'));
  const [signingOut, setSigningOut] = useState(false);

  const supabase = createClient();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-card border-r border-border transition-all duration-300 sticky top-0 shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>

      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-border shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-bold text-foreground">AuditPilot</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">GRC Platform</span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" title="AuditPilot">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </Link>
        )}
      </div>

      {/* Org badge */}
      {!collapsed && organisation && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">{organisation.name}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href)}
          />
        ))}

        {/* Settings section */}
        <div className="pt-2">
          {!collapsed ? (
            <>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={cn(
                  'nav-item w-full',
                  pathname.startsWith('/settings') ? 'nav-item-active' : 'nav-item-inactive'
                )}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Settings</span>
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  settingsOpen && 'rotate-180'
                )} />
              </button>
              {settingsOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                  {SETTINGS_ITEMS.map(item => (
                    <NavLink
                      key={item.href}
                      item={item}
                      collapsed={false}
                      active={isActive(item.href)}
                      small
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <NavLink
              item={{ href: '/settings/team', label: 'Settings', icon: Settings }}
              collapsed
              active={pathname.startsWith('/settings')}
            />
          )}
        </div>

        {/* Platform admin link */}
        {profile?.is_platform_admin && (
          <NavLink
            item={{ href: '/admin', label: 'Admin Panel', icon: Lock }}
            collapsed={collapsed}
            active={isActive('/admin')}
          />
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-2 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted transition-colors">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(profile?.full_name?.[0] || profile?.email?.[0] || '?').toUpperCase()}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {profile?.full_name || profile?.email || 'User'}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">{profile?.role}</p>
            </div>
            {/* Notifications bell - real-time */}
            {profile?.id && profile?.organisation_id && (
              <NotificationsBell
                userId={profile.id}
                orgId={profile.organisation_id}
                initialCount={unreadCount}
              />
            )}
            {/* Sign out */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="p-1 rounded hover:bg-muted"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center text-white text-xs font-bold">
              {(profile?.full_name?.[0] || '?').toUpperCase()}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1 rounded hover:bg-muted"
            >
              <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-1 flex items-center justify-center w-full py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs gap-1"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  item, collapsed, active, small = false,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  small?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'nav-item',
        active ? 'nav-item-active' : 'nav-item-inactive',
        small && 'py-2 text-xs',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('shrink-0', small ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <Badge variant="info" className="text-[10px] px-1.5 py-0 shrink-0">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}
