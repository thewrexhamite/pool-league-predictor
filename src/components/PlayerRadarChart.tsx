'use client';

import { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface PlayerRadarChartProps {
  player1Name: string;
  player2Name: string;
  player1Data: {
    winPct: number;
    formPct: number;
    clutch: number; // 0-100
    h2hPct: number; // 0-100
    homePct: number;
    awayPct: number;
  };
  player2Data: {
    winPct: number;
    formPct: number;
    clutch: number;
    h2hPct: number;
    homePct: number;
    awayPct: number;
  };
}

export default function PlayerRadarChart({ player1Name, player2Name, player1Data, player2Data }: PlayerRadarChartProps) {
  const radarData = useMemo(() => [
    { axis: 'Win %', player1: player1Data.winPct, player2: player2Data.winPct },
    { axis: 'Form', player1: player1Data.formPct, player2: player2Data.formPct },
    { axis: 'Clutch', player1: player1Data.clutch, player2: player2Data.clutch },
    { axis: 'H2H', player1: player1Data.h2hPct, player2: player2Data.h2hPct },
    { axis: 'Home', player1: player1Data.homePct, player2: player2Data.homePct },
    { axis: 'Away', player1: player1Data.awayPct, player2: player2Data.awayPct },
  ], [player1Data, player2Data]);

  return (
    <div className="bg-surface rounded-lg p-4 shadow-card">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
        Radar Comparison
      </h3>
      <div className="flex items-center justify-center gap-4 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#0EA572]" />
          <span className="text-xs text-gray-400 truncate max-w-[120px]" title={player1Name}>{player1Name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
          <span className="text-xs text-gray-400 truncate max-w-[120px]" title={player2Name}>{player2Name}</span>
        </div>
      </div>
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name={player1Name}
              dataKey="player1"
              stroke="#0EA572"
              fill="#0EA572"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              name={player2Name}
              dataKey="player2"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
