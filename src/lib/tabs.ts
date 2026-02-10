import {
  LayoutDashboard,
  Trophy,
  Calendar,
  BarChart3,
  Shield,
} from 'lucide-react';
import type { TabId } from './router';

export interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}

export const TABS: TabConfig[] = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'standings', label: 'Standings', shortLabel: 'Table', icon: Trophy },
  { id: 'matches', label: 'Matches', shortLabel: 'Matches', icon: Calendar },
  { id: 'stats', label: 'Stats', shortLabel: 'Stats', icon: BarChart3 },
  { id: 'myteam', label: 'My Team', shortLabel: 'Team', icon: Shield },
];
