import { Building2, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  // Other path prefixes that belong to this section (e.g. /apartments/:id under "Квартири").
  alsoActiveOn?: string[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Квартири', icon: Building2, alsoActiveOn: ['/apartments'] },
  { href: '/tenants', label: 'Мешканці', icon: Users },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const prefixes = [item.href, ...(item.alsoActiveOn ?? [])].filter((p) => p !== '/');
  return (item.href === '/' && pathname === '/') || prefixes.some((p) => pathname.startsWith(p));
}
