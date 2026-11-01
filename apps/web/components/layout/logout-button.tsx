'use client';

import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/lib/auth/queries';

export function LogoutButton() {
  const logout = useLogout();
  return (
    <Button
      variant="ghost"
      aria-label="Вийти"
      disabled={logout.isPending}
      onClick={() =>
        logout.mutate(undefined, {
          onError: () => toast.error('Не вдалося вийти. Спробуйте ще раз.'),
        })
      }
    >
      <LogOut />
      <span className="hidden sm:inline">Вийти</span>
    </Button>
  );
}
