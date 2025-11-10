
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Building,
  GitBranch,
  BarChart2,
  Settings,
  FileText,
} from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import { useMemo } from 'react';

const baseNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/workflows', label: 'Workflows', icon: GitBranch },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
];

const adminNavItems = [
  { href: '/departments', label: 'Departments', icon: Building },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();
  const { currentUser } = useAppContext();

  const navItems = useMemo(() => {
    if (currentUser?.role === 'Administrator') {
      // Admins see base items plus admin-specific items
      return [...baseNavItems, ...adminNavItems];
    }
    // Non-admins see only the base items
    return baseNavItems;
  }, [currentUser]);


  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref>
            <SidebarMenuButton
              isActive={pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/')}
              tooltip={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
