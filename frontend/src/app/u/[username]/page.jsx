import RouteClient from '../../route-client.jsx';

export const metadata = {
  title: 'Public Profile',
  description: 'View an Aptico public career profile.'
};

export default function Page() {
  return <RouteClient name="publicProfile" />;
}
