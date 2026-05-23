import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Admin' };

export default function Page() {
  return <RouteClient name="controlCenter" guard="admin" />;
}
