import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Settings' };

export default function Page() {
  return <RouteClient name="settings" guard="protected" />;
}
