import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Profile' };

export default function Page() {
  return <RouteClient name="profile" guard="protected" />;
}
