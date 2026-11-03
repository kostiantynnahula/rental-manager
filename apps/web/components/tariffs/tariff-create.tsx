'use client';

import { useSearchParams } from 'next/navigation';
import { parseApartmentId } from './helpers/parse-apartment-id';
import { TariffForm } from './tariff-form';

// /tariffs/new, optionally ?apartmentId= (from an apartment's "Тарифи" tab). Reads search params → the page
// wraps it in <Suspense>.
export function TariffCreate() {
  const apartmentId = parseApartmentId(useSearchParams().get('apartmentId'));
  // key: a fresh form (new defaults) when the preselected apartment changes.
  return <TariffForm key={apartmentId ?? 'none'} apartmentId={apartmentId} />;
}
