import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Support' };

export default function Page() {
  return <RouteClient name="support" guard="protected" />;
}
