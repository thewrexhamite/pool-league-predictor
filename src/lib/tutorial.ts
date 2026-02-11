import type { TabId } from './router';

export interface TutorialStep {
  id: string;
  target: string;
  title: string;
  content: string | ((user?: { name: string }) => string);
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlight: 'rect' | 'circle' | 'pill';
  tab?: TabId;
  action?: 'click' | 'hover';
  celebrate?: 'confetti-subtle' | 'confetti-grand' | 'badge-unlock';
  milestone?: string;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  emoji: string;
  steps: TutorialStep[];
  requiredRole?: 'user' | 'captain' | 'admin';
  estimatedTime: string;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export const TUTORIALS: Tutorial[] = [
  {
    id: 'command-centre',
    name: 'Your Command Centre',
    description: 'Learn the basics of navigating Pool League Pro',
    emoji: '🎱',
    steps: [
      {
        id: 'welcome',
        target: 'header',
        title: 'Welcome!',
        content: (user) =>
          `${greeting()}${user?.name ? `, ${user.name}` : ''}! Let's show you around — this takes about 2 minutes.`,
        placement: 'bottom',
        spotlight: 'rect',
      },
      {
        id: 'header-bar',
        target: 'header',
        title: 'Your command centre',
        content: 'League info, search, and settings — all one tap away.',
        placement: 'bottom',
        spotlight: 'rect',
      },
      {
        id: 'standings-tab',
        target: 'tab-standings',
        title: 'The League Table',
        content: 'Tap any team to see their full story — form, players, and upcoming fixtures.',
        placement: 'top',
        spotlight: 'pill',
        tab: 'standings',
        milestone: '25%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'matches-tab',
        target: 'tab-matches',
        title: 'Upcoming Fixtures',
        content: 'Upcoming fixtures with AI-powered win predictions. Never miss a match day.',
        placement: 'top',
        spotlight: 'pill',
        tab: 'matches',
      },
      {
        id: 'stats-tab',
        target: 'tab-stats',
        title: 'Player Stats',
        content: 'Every player ranked. Sort, filter, and discover hidden gems.',
        placement: 'top',
        spotlight: 'pill',
        tab: 'stats',
        milestone: '50%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'myteam-tab',
        target: 'tab-myteam',
        title: 'My Team',
        content: 'Set a favourite team and get a personalised dashboard with squad and predictions.',
        placement: 'top',
        spotlight: 'pill',
        tab: 'myteam',
        milestone: '75%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'search',
        target: 'search',
        title: 'Quick Search',
        content: 'Find any player or team instantly — or press Cmd+K for quick lookup.',
        placement: 'bottom',
        spotlight: 'pill',
        milestone: '100%',
        celebrate: 'confetti-grand',
      },
    ],
    estimatedTime: '2 min',
  },
  {
    id: 'unlock-edge',
    name: 'Unlock Your Edge',
    description: 'Discover features exclusive to signed-in users',
    emoji: '🔓',
    requiredRole: 'user',
    steps: [
      {
        id: 'intro',
        target: 'user-menu',
        title: 'Your Account',
        content: "You've got an account — now let's unlock the good stuff.",
        placement: 'bottom',
        spotlight: 'circle',
      },
      {
        id: 'claim-profile',
        target: 'claim-profile',
        title: 'Claim Your Profile',
        content: 'Link your player profile to see your personal stats everywhere.',
        placement: 'bottom',
        spotlight: 'pill',
        milestone: '25%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'ai-chat',
        target: 'ai-chat',
        title: 'AI Assistant',
        content: 'Ask anything about the league — our AI knows every stat, every match.',
        placement: 'top',
        spotlight: 'circle',
        milestone: '50%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'player-compare',
        target: 'tab-stats',
        title: 'Player Comparison',
        content: 'Go head-to-head with any player. Who\'s really better?',
        placement: 'top',
        spotlight: 'pill',
        tab: 'stats',
        milestone: '75%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'notifications',
        target: 'user-menu',
        title: 'Notifications',
        content: "Never miss a match day. Get alerts for your team's fixtures.",
        placement: 'bottom',
        spotlight: 'circle',
        milestone: '100%',
        celebrate: 'badge-unlock',
      },
    ],
    estimatedTime: '90 sec',
  },
  {
    id: 'captain-playbook',
    name: "Captain's Playbook",
    description: 'Master the tools built for team captains',
    emoji: '📋',
    requiredRole: 'captain',
    steps: [
      {
        id: 'intro',
        target: 'tab-myteam',
        title: 'Your Tactical Advantage',
        content: "Ready to lead? Here's your tactical advantage.",
        placement: 'top',
        spotlight: 'pill',
        tab: 'myteam',
      },
      {
        id: 'captain-dashboard',
        target: 'captain-dashboard',
        title: 'Captain Dashboard',
        content: 'Player availability, team form, and opponent intel — all in one view.',
        placement: 'top',
        spotlight: 'rect',
        tab: 'myteam',
        milestone: '33%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'lineup-optimizer',
        target: 'lineup-optimizer',
        title: 'Lineup Optimizer',
        content: 'AI-suggested lineups based on player form and matchup data.',
        placement: 'top',
        spotlight: 'rect',
        milestone: '66%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'complete',
        target: 'tab-myteam',
        title: "You're Set!",
        content: "Your team's in good hands. Check back before each match for fresh insights.",
        placement: 'top',
        spotlight: 'pill',
        milestone: '100%',
        celebrate: 'confetti-subtle',
      },
    ],
    estimatedTime: '90 sec',
  },
  {
    id: 'league-control',
    name: 'League Control',
    description: 'Admin tools for managing your league',
    emoji: '🛡️',
    requiredRole: 'admin',
    steps: [
      {
        id: 'intro',
        target: 'user-menu',
        title: 'Running the Show',
        content: "You're running the show. Here's everything you need.",
        placement: 'bottom',
        spotlight: 'circle',
      },
      {
        id: 'admin-access',
        target: 'user-menu',
        title: 'Admin Dashboard',
        content: 'The admin dashboard — manage leagues, players, and data from the menu.',
        placement: 'bottom',
        spotlight: 'circle',
        milestone: '33%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'captain-verify',
        target: 'user-menu',
        title: 'Captain Verification',
        content: "Verify captain claims to give them the green badge. It's in the admin dashboard.",
        placement: 'bottom',
        spotlight: 'circle',
        milestone: '66%',
        celebrate: 'confetti-subtle',
      },
      {
        id: 'complete',
        target: 'header',
        title: 'All Set',
        content: "You're in control. The league's in safe hands.",
        placement: 'bottom',
        spotlight: 'rect',
        milestone: '100%',
        celebrate: 'confetti-grand',
      },
    ],
    estimatedTime: '60 sec',
  },
];

export function getTutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find(t => t.id === id);
}

export function getAvailableTutorials(role?: 'user' | 'captain' | 'admin'): Tutorial[] {
  return TUTORIALS.filter(t => {
    if (!t.requiredRole) return true;
    if (!role) return false;
    if (role === 'admin') return true;
    if (role === 'captain') return t.requiredRole !== 'admin';
    return t.requiredRole === 'user';
  });
}
