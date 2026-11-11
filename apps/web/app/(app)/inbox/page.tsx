import type { Metadata } from 'next';
import { InboxPage } from '@/components/photos/inbox-page';

export const metadata: Metadata = { title: 'Вхідні' };

export default function InboxRoute() {
  return <InboxPage />;
}
