import { LogoutButton } from './logout-button';
import { NavLinks } from './nav-links';

export const APP_NAME = 'Rental Manager';

// Mobile: top bar + fixed bottom nav. From md: sidebar on the left instead of the bottom nav.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center px-4 font-semibold">{APP_NAME}</div>
        <nav className="flex flex-col gap-1 px-2" aria-label="Основна навігація">
          <NavLinks variant="sidebar" />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:px-6">
          <span className="font-semibold md:invisible">{APP_NAME}</span>
          <LogoutButton />
        </header>
        {/* Bottom padding keeps content clear of the fixed mobile nav (4rem + home indicator). */}
        <main className="flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6">
          {children}
        </main>
      </div>

      <nav
        aria-label="Основна навігація"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
