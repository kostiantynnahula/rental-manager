import { Phone } from 'lucide-react';
import { telHref } from '@/lib/format';
import { formatPhone } from '@/lib/phone';

export function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={telHref(phone)}
      className="inline-flex min-h-11 items-center gap-2 text-primary underline-offset-4 hover:underline md:min-h-0"
    >
      <Phone className="size-4" />
      <span className="whitespace-nowrap">{formatPhone(phone)}</span>
    </a>
  );
}
