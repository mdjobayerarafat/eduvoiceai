
import type { LucideIcon } from 'lucide-react';
import { Home, BookOpen, Mic, HelpCircle, Languages, Smile, Settings, CreditCard, Key, Users, Ticket, LayoutDashboard, ShieldAlert } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPaths?: string[]; // For highlighting active link based on sub-paths
}

export const APP_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Topic Lecture', href: '/lectures', icon: BookOpen, matchPaths: ['/lectures', '/lectures/history', '/lectures/view'] },
  { label: 'Mock Interview', href: '/interviews', icon: Mic, matchPaths: ['/interviews', '/interviews/history', '/interviews/report'] },
  { label: 'Q&A Prep', href: '/qa-prep', icon: HelpCircle, matchPaths: ['/qa-prep'] },
  { label: 'Learn Language', href: '/language', icon: Languages, matchPaths: ['/language'] },
  { label: 'Meditation', href: '/meditation', icon: Smile, matchPaths: ['/meditation'] },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
    { label: 'API Keys', href: '/settings/api-keys', icon: Key },
    { label: 'Subscription', href: '/settings/subscription', icon: CreditCard },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Admin Dashboard', href: '/admin/admindashboard', icon: ShieldAlert, matchPaths: ['/admin/admindashboard'] },
  { label: 'Manage Users', href: '/admin/users', icon: Users, matchPaths: ['/admin/users'] },
  { label: 'Manage Vouchers', href: '/admin/vouchers', icon: Ticket, matchPaths: ['/admin/vouchers'] },
];

export const USER_NAV_ITEMS = [
  { label: 'Profile', href: '/profile' }, 
  { label: 'Settings', href: '/settings/api-keys' },
  // Logout will be handled by a function in AppHeader
];

