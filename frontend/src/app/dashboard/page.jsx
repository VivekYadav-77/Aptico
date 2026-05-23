import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Dashboard' };

export default function Page() {
  return <RouteClient name="mainDashboard" guard="protected" />;
}
