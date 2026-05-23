import RouteClient from '../route-client.jsx';

export const metadata = {
  title: 'Docs',
  description: 'Plain-language Aptico feature guides and platform documentation.'
};

export default function Page() {
  return <RouteClient name="docsHub" />;
}
