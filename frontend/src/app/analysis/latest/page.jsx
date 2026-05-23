import RouteClient from '../../route-client.jsx';

export const metadata = { title: 'Latest Analysis' };

export default function Page() {
  return <RouteClient name="latestAnalysis" guard="protected" />;
}
