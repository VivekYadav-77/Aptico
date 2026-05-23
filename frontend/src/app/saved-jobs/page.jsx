import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Saved Jobs' };

export default function Page() {
  return <RouteClient name="savedJobs" guard="protected" />;
}
