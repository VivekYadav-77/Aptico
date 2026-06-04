import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Career Feed' };

export default function Page() {
  return <RouteClient name="home" guard="protected" />;
}
