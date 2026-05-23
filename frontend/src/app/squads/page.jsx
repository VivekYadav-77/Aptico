import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Squads' };

export default function Page() {
  return <RouteClient name="squads" guard="protected" />;
}
