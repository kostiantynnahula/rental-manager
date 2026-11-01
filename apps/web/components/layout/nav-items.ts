import { Building2, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Квартири', icon: Building2 },
  { href: '/tenants', label: 'Мешканці', icon: Users },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
}
