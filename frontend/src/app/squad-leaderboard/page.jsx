import RouteClient from '../route-client.jsx';

export const metadata = { title: 'Squad Leaderboard' };

export default function Page() {
  return <RouteClient name="squadLeaderboard" guard="protected" />;
}
