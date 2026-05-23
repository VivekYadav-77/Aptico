import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Notifications' };

export default function Page() {
  return <RouteClient name="notifications" guard="protected" />;
}
