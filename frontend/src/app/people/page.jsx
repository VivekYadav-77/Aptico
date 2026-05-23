import RouteClient from '../route-client.jsx';

export const metadata = { title: 'People' };

export default function Page() {
  return <RouteClient name="peopleDiscovery" guard="protected" />;
}
