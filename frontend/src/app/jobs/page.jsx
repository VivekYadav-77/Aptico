import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Job Search' };

export default function Page() {
  return <RouteClient name="modernJobSearch" guard="protected" />;
}
