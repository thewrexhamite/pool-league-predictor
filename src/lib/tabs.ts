import {
  LayoutDashboard,
  Trophy,
  ClipboardList,
  Dices,
  Target,
  Calendar,
  Users,
  BarChart3,
  GitCompare,
  Settings,
  Shield,
} from 'lucide-react';
import type { TabId } from './router';

export interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  primary: boolean;
}

export const TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash', icon: LayoutDashboard, primary: true },
  { id: 'standings', label: 'Standings', shortLabel: 'Table', icon: Trophy, primary: true },
  { id: 'stats', label: 'Stats', shortLabel: 'Stats', icon: BarChart3, primary: true },
  { id: 'predict', label: 'Predict', shortLabel: 'Predict', icon: Target, primary: true },
  { id: 'fixtures', label: 'Fixtures', shortLabel: 'Fix', icon: Calendar, primary: true },
  { id: 'results', label: 'Results', shortLabel: 'Results', icon: ClipboardList, primary: false },
  { id: 'simulate', label: 'Simulate', shortLabel: 'Sim', icon: Dices, primary: false },
  { id: 'optimizer', label: 'Optimizer', shortLabel: 'Opt', icon: Settings, primary: false },
  { id: 'players', label: 'Players', shortLabel: 'Players', icon: Users, primary: false },
  { id: 'compare', label: 'Compare', shortLabel: 'Compare', icon: GitCompare, primary: false },
  { id: 'captain', label: 'Captain', shortLabel: 'Captain', icon: Shield, primary: false },
];

export const PRIMARY_TABS = TABS.filter(t => t.primary);
export const SECONDARY_TABS = TABS.filter(t => !t.primary);
