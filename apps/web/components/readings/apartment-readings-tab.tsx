import { PencilLine } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Apartment } from '@/lib/api/queries/apartments';
import { ReadingHistory } from './reading-history';

// Apartment page, tab "Показання": entry point to the batch form, then the history.
export function ApartmentReadingsTab({ apartment }: { apartment: Apartment }) {
  return (
    <div className="space-y-6">
      <Button asChild className="w-full sm:w-auto">
        <Link href={`/apartments/${apartment.id}/readings/new`}>
          <PencilLine />
          Внести показання
        </Link>
      </Button>
      <ReadingHistory apartment={apartment} />
    </div>
  );
}
