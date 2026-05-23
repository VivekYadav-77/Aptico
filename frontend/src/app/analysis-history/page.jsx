import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Analysis History' };

export default function Page() {
  return <RouteClient name="analysisHistory" guard="protected" />;
}
