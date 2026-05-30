import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Feed' };

export default function Page() {
  return <RouteClient name="home" guard="protected" />;
}
