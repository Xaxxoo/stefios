import type { Metadata } from 'next';
import { ActivityPage as ActivityScreen } from '../../../features/activity/activity-page';
export const metadata: Metadata = {
  title: 'Activity',
  description: 'Normalized account activity.',
};
export default function ActivityPage() {
  return <ActivityScreen />;
}
