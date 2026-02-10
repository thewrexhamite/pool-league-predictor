'use client';

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import type { WidgetConfig, WidgetType } from '@/lib/dashboard-config';
import { getActiveWidgets } from '@/lib/dashboard-config';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { useActiveData } from '@/lib/active-data-provider';
import WidgetContainer from './WidgetContainer';
import {
  SeasonProgressWidget,
  TitleRaceWidget,
  RelegationWidget,
  NextMatchdayWidget,
  RecentResultsWidget,
  HotColdWidget,
  PredictionAccuracyWidget,
  MyTeamWidget,
  PowerRankingsWidget,
  StrengthOfScheduleWidget,
  ClutchPerformersWidget,
  MatchImportanceWidget,
  TeamFormHeatmapWidget,
  BreakoutPlayerWidget,
  LeagueHealthWidget,
} from './widgets';
import {
  getRemainingFixtures,
  getTeamResults,
  calcPlayerForm,
  getDiv,
  parseDate,
} from '@/lib/predictions';

interface DashboardEditorProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onPredict: (home: string, away: string) => void;
  isEditMode?: boolean;
}

interface SortableWidgetProps {
  widget: WidgetConfig;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

function SortableWidget({ widget, isEditMode, onRemove, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <WidgetContainer
        config={widget}
        isDragging={isDragging}
        isEditMode={isEditMode}
        onRemove={onRemove}
      >
        {children}
      </WidgetContainer>
    </div>
  );
}

export default function DashboardEditor({
  selectedDiv,
  standings,
  myTeam,
  onTeamClick,
  onPlayerClick,
  onPredict,
  isEditMode = false,
}: DashboardEditorProps) {
  const { data: activeData, ds, frames } = useActiveData();
  const { dashboardConfig, removeWidget, reorderWidgets } = useDashboardConfig();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get enabled widgets sorted by order
  const activeWidgets = useMemo(
    () => getActiveWidgets(dashboardConfig),
    [dashboardConfig]
  );

  // Pre-calculate data needed by widgets
  const divResults = useMemo(
    () => ds.results.filter(r => getDiv(r.home, ds) === selectedDiv),
    [ds, selectedDiv]
  );

  const remaining = useMemo(
    () => getRemainingFixtures(selectedDiv, ds),
    [selectedDiv, ds]
  );

  const totalPlayed = divResults.length;
  const totalGames = totalPlayed + remaining.length;
  const pct = totalGames > 0 ? Math.round((totalPlayed / totalGames) * 100) : 0;

  // Form: last 5 for each team
  const teamForms = useMemo(() => {
    const forms: Record<string, { results: ('W' | 'L' | 'D')[]; pts: number }> = {};
    for (const s of standings) {
      const teamRes = getTeamResults(s.team, ds);
      const last5 = teamRes.slice(0, 5).map(r => r.result);
      const pts = last5.reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
      forms[s.team] = { results: last5, pts };
    }
    return forms;
  }, [standings, ds]);

  // Hot & cold teams
  const bestFormTeam = useMemo(() => {
    let best = standings[0]?.team;
    let bestPts = 0;
    for (const [team, form] of Object.entries(teamForms)) {
      if (form.pts > bestPts) {
        bestPts = form.pts;
        best = team;
      }
    }
    return best;
  }, [standings, teamForms]);

  const worstFormTeam = useMemo(() => {
    let worst = standings[standings.length - 1]?.team;
    let worstPts = 999;
    for (const [team, form] of Object.entries(teamForms)) {
      if (form.results.length >= 3 && form.pts < worstPts) {
        worstPts = form.pts;
        worst = team;
      }
    }
    return worst;
  }, [standings, teamForms]);

  // Hot & cold players
  const { hotPlayer, coldPlayer } = useMemo(() => {
    if (frames.length === 0) return { hotPlayer: null, coldPlayer: null };
    const teams = ds.divisions[selectedDiv].teams;
    let hot: { name: string; pct: number } | null = null;
    let cold: { name: string; pct: number } | null = null;
    const seen = new Set<string>();

    for (const team of teams) {
      for (const frame of frames) {
        if (frame.home !== team && frame.away !== team) continue;
        for (const f of frame.frames) {
          const name = frame.home === team ? f.homePlayer : f.awayPlayer;
          if (!name || seen.has(name)) continue;
          seen.add(name);
          const form = calcPlayerForm(name, frames);
          if (!form || form.last5.p < 3) continue;
          if (!hot || form.last5.pct > hot.pct) hot = { name, pct: form.last5.pct };
          if (!cold || form.last5.pct < cold.pct) cold = { name, pct: form.last5.pct };
        }
      }
    }
    return { hotPlayer: hot, coldPlayer: cold };
  }, [frames, ds.divisions, selectedDiv]);

  const leader = standings[0];

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activeWidgets.findIndex(w => w.id === active.id);
      const newIndex = activeWidgets.findIndex(w => w.id === over.id);

      const reordered = arrayMove(activeWidgets, oldIndex, newIndex);
      reorderWidgets(reordered.map(w => w.id));
    }
  };

  // Render individual widget based on type
  const renderWidget = (widget: WidgetConfig) => {
    const type = widget.type;

    switch (type) {
      case 'my-team':
        if (!myTeam || myTeam.div !== selectedDiv) return null;
        return (
          <MyTeamWidget
            team={myTeam.team}
            div={myTeam.div}
            standings={standings}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
            onPredict={onPredict}
          />
        );

      case 'season-progress':
        return (
          <SeasonProgressWidget
            totalPlayed={totalPlayed}
            remaining={remaining.length}
            pct={pct}
          />
        );

      case 'title-race':
        return (
          <TitleRaceWidget
            standings={standings}
            leader={leader}
            teamForms={teamForms}
            myTeam={myTeam}
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
          />
        );

      case 'relegation-battle':
        return (
          <RelegationWidget
            standings={standings}
            teamForms={teamForms}
            myTeam={myTeam}
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
          />
        );

      case 'next-matchday':
        return (
          <NextMatchdayWidget
            selectedDiv={selectedDiv}
            myTeam={myTeam}
            onPredict={onPredict}
          />
        );

      case 'recent-results':
        return (
          <RecentResultsWidget
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
          />
        );

      case 'hot-cold':
        return (
          <HotColdWidget
            bestFormTeam={bestFormTeam}
            worstFormTeam={worstFormTeam}
            hotPlayer={hotPlayer}
            coldPlayer={coldPlayer}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
          />
        );

      case 'prediction-accuracy':
        return <PredictionAccuracyWidget selectedDiv={selectedDiv} />;

      case 'power-rankings':
        return (
          <PowerRankingsWidget
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
          />
        );

      case 'strength-of-schedule':
        return (
          <StrengthOfScheduleWidget
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
          />
        );

      case 'clutch-performers':
        return (
          <ClutchPerformersWidget
            selectedDiv={selectedDiv}
            onPlayerClick={onPlayerClick}
          />
        );

      case 'match-importance':
        return (
          <MatchImportanceWidget
            selectedDiv={selectedDiv}
            onPredict={onPredict}
          />
        );

      case 'team-form-heatmap':
        if (!myTeam || myTeam.div !== selectedDiv) return null;
        return (
          <TeamFormHeatmapWidget
            team={myTeam.team}
            div={myTeam.div}
            onTeamClick={onTeamClick}
          />
        );

      case 'breakout-players':
        return (
          <BreakoutPlayerWidget
            selectedDiv={selectedDiv}
            onPlayerClick={onPlayerClick}
          />
        );

      case 'league-health':
        return <LeagueHealthWidget selectedDiv={selectedDiv} />;

      default:
        return null;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={activeWidgets.map(w => w.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {activeWidgets.map(widget => {
            const content = renderWidget(widget);
            if (!content) return null;

            return (
              <SortableWidget
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                onRemove={removeWidget}
              >
                {content}
              </SortableWidget>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
