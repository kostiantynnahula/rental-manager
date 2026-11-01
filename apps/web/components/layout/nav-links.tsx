'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { isNavItemActive, NAV_ITEMS } from './nav-items';

type Variant = 'sidebar' | 'bottom';

const linkClass: Record<Variant, { base: string; active: string; icon: string }> = {
  sidebar: {
    base: 'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent',
    active: 'bg-sidebar-accent text-sidebar-accent-foreground',
    icon: 'size-4',
  },
  bottom: {
    base: 'flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground',
    active: 'text-foreground',
    icon: 'size-5',
  },
};

function Links({ variant, pathname }: { variant: Variant; pathname: string | null }) {
  const styles = linkClass[variant];
  return NAV_ITEMS.map((item) => {
    const active = pathname !== null && isNavItemActive(item, pathname);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(styles.base, active && styles.active)}
      >
        <item.icon className={styles.icon} />
        {item.label}
      </Link>
    );
  });
}

function ActiveLinks({ variant }: { variant: Variant }) {
  return <Links variant={variant} pathname={usePathname()} />;
}

// usePathname() is request-time data on dynamic routes (/apartments/[id]) under cacheComponents, so it needs
// its own Suspense boundary; the fallback is the same links without the active highlight. This keeps the
// rest of the shell prerendered.
export function NavLinks({ variant }: { variant: Variant }) {
  return (
    <Suspense fallback={<Links variant={variant} pathname={null} />}>
      <ActiveLinks variant={variant} />
    </Suspense>
  );
}
