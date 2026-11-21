import { Redirect } from 'expo-router';
import { useSession } from '@/lib/store';

/** Entry: send signed-in staff to the right home tab for this business. */
export default function Index() {
  const { pairing, token, config } = useSession();
  if (!pairing) return <Redirect href="/pair" />;
  if (!token) return <Redirect href="/lock" />;
  return <Redirect href={config?.capabilities.tables === false ? '/orders' : '/tables'} />;
}
