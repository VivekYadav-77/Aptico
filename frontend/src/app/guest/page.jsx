import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Welcome' };

export default function Page() {
  return <RouteClient name="guest" />;
}
