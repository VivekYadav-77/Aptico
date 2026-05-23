import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Resume Analysis' };

export default function Page() {
  return <RouteClient name="analysis" guard="protected" />;
}
