import type { Meter } from '@/lib/api/queries/meters';

// Why an action isn't available (null = available). The flags come from the server; the API re-checks on submit.
export function meterActionReasons(meter: Meter) {
  const removed = meter.removedAt !== null;
  return {
    fixInitial: removed ? 'Лічильник знято' : meter.canEditInitialValues ? null : 'Вже є показання',
    replace: removed ? 'Лічильник знято' : null,
    remove: removed ? 'Лічильник знято' : null,
    delete: meter.canDelete ? null : 'Є показання — лічильник можна лише зняти',
  };
}
