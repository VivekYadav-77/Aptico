import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Sign In' };

export default function Page() {
  return <RouteClient name="auth" />;
}
