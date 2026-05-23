import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Portfolio Generator' };

export default function Page() {
  return <RouteClient name="portfolioGenerator" guard="protected" />;
}
