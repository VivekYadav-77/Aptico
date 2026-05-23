import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Interview Prep' };

export default function Page() {
  return <RouteClient name="interviewPrep" guard="protected" />;
}
