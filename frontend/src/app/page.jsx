import RouteClient from './route-client.jsx';

export const metadata = {
  title: 'Aptico',
  description: 'Analyze your resume, find better jobs, build a public career profile, and stay accountable with Aptico.'
};

export default function Page() {
  return <RouteClient name="root" />;
}
