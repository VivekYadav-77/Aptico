import RouteClient from '../../route-client.jsx';

export const metadata = {
  title: 'Shadow Resume',
  description: 'Explore a candidate career story through Aptico Shadow Resume.'
};

export default function Page() {
  return <RouteClient name="shadowResume" />;
}
