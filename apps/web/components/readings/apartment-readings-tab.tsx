import { PencilLine } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Apartment } from '@/lib/api/queries/apartments';

// Apartment page, tab "Показання". For now just the entry point to the batch form.
export function ApartmentReadingsTab({ apartment }: { apartment: Apartment }) {
  return (
    <Button asChild className="w-full sm:w-auto">
      <Link href={`/apartments/${apartment.id}/readings/new`}>
        <PencilLine />
        Внести показання
      </Link>
    </Button>
  );
}
