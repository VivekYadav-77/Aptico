import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Rewards' };

export default function Page() {
  return <RouteClient name="rewards" guard="protected" />;
}
