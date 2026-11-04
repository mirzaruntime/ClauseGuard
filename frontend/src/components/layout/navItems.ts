import { LayoutDashboard, FileText, ListChecks, BellRing, Settings } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contracts', label: 'Contracts', icon: FileText },
  { to: '/obligations', label: 'Obligations', icon: ListChecks },
  { to: '/reminders', label: 'Reminders', icon: BellRing },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;
