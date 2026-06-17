'use client';

import AnalysisHistoryPage from '../screens/AnalysisHistoryPage.jsx';
import AnalysisWorkspace from '../screens/AnalysisWorkspace.jsx';
import AuthPermanent from '../screens/AuthPermanent.jsx';
import CommunityWins from '../screens/CommunityWins.jsx';
import ContactSupport from '../screens/ContactSupport.jsx';
import ControlCenter from '../screens/ControlCenter.jsx';
import DocArticlePage from '../features/docs/pages/DocArticlePage.jsx';
import DocsHubPage from '../features/docs/pages/DocsHubPage.jsx';
import GuestDashboard from '../screens/GuestDashboard.jsx';
import HomeFeed from '../screens/HomeFeed.jsx';
import InterviewPrepPage from '../screens/InterviewPrepPage.jsx';
import LatestAnalysisPage from '../screens/LatestAnalysisPage.jsx';
import LegalPage from '../screens/LegalPage.jsx';
import MainDashboard from '../screens/MainDashboard.jsx';
import ModernJobSearchPage from '../screens/ModernJobSearchPage.jsx';
import Notifications from '../screens/Notifications.jsx';
import PeopleDiscovery from '../screens/PeopleDiscovery.jsx';
import PortfolioGenerator from '../screens/PortfolioGenerator.jsx';
import ProfilePage from '../screens/ProfilePage.jsx';
import PublicProfile from '../screens/PublicProfile.jsx';
import ResilienceDetailsPage from '../screens/ResilienceDetailsPage.jsx';
import RewardsPage from '../screens/RewardsPage.jsx';
import SavedJobsPage from '../screens/SavedJobsPage.jsx';
import SettingsPage from '../screens/SettingsPage.jsx';
import ShadowResume from '../screens/ShadowResume.jsx';
import SquadDashboard from '../screens/SquadDashboard.jsx';
import SquadLeaderboardPage from '../screens/SquadLeaderboardPage.jsx';
import SupportCenter from '../screens/SupportCenter.jsx';

export const routeRegistry = {
  analysis: AnalysisWorkspace,
  analysisHistory: AnalysisHistoryPage,
  auth: AuthPermanent,
  communityWins: CommunityWins,
  contactSupport: ContactSupport,
  controlCenter: ControlCenter,
  docArticle: DocArticlePage,
  docsHub: DocsHubPage,
  guest: GuestDashboard,
  home: HomeFeed,
  interviewPrep: InterviewPrepPage,
  latestAnalysis: LatestAnalysisPage,
  legal: LegalPage,
  mainDashboard: MainDashboard,
  modernJobSearch: ModernJobSearchPage,
  notifications: Notifications,
  peopleDiscovery: PeopleDiscovery,
  portfolioGenerator: PortfolioGenerator,
  profile: ProfilePage,
  publicProfile: PublicProfile,
  resilienceDetails: ResilienceDetailsPage,
  rewards: RewardsPage,
  savedJobs: SavedJobsPage,
  settings: SettingsPage,
  shadowResume: ShadowResume,
  squadLeaderboard: SquadLeaderboardPage,
  squads: SquadDashboard,
  support: SupportCenter
};

export function getRouteComponent(name) {
  return routeRegistry[name] || null;
}
