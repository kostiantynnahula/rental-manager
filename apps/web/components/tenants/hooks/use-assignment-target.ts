'use client';

import { useEffect } from 'react';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { useApartment } from '@/lib/api/queries/apartments';
import type { TenantFormValues } from '../helpers/tenant-form-schema';

// Loads the selected apartment (fresh current lease) and sets the assignment mode from it:
// a current lease → ADD_CONTACT to it, none → NEW_LEASE. '' while nothing is selected or still loading.
export function useAssignmentTarget(
  control: Control<TenantFormValues>,
  setValue: UseFormSetValue<TenantFormValues>,
) {
  const apartmentId = useWatch({ control, name: 'assignment.apartmentId' });
  const mode = useWatch({ control, name: 'assignment.mode' });
  const apartment = useApartment(apartmentId, { enabled: apartmentId !== '' });
  const data = apartmentId && apartment.data?.id === apartmentId ? apartment.data : undefined;

  useEffect(() => {
    // Not a user edit: don't mark the form dirty.
    const lease = data?.currentLease;
    setValue('assignment.mode', !data ? '' : lease ? 'ADD_CONTACT' : 'NEW_LEASE');
    setValue('assignment.leaseId', lease?.id ?? '');
  }, [data, setValue]);

  return {
    apartmentId,
    apartment: data,
    query: apartment,
    // Submit waits until we know which mode applies.
    pending: apartmentId !== '' && mode === '',
  };
}
