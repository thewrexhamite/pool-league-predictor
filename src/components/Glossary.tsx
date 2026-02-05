'use client';

import { useState } from 'react';
import { HOME_ADV } from '@/lib/data';

export default function Glossary() {
  const [showGlossary, setShowGlossary] = useState(false);
  const homeAdvPct = (1 / (1 + Math.exp(-HOME_ADV)) * 100 - 50).toFixed(0);

  return (
    <div className="mt-8">
      <button
        onClick={() => setShowGlossary(!showGlossary)}
        className="w-full text-center text-gray-400 hover:text-gray-200 text-sm py-2 transition"
      >
        {showGlossary ? 'Hide' : 'Show'} How It Works &amp; Glossary{' '}
        {showGlossary ? '\u25B2' : '\u25BC'}
      </button>
      {showGlossary && (
        <div className="bg-gray-800 rounded-xl p-4 md:p-6 mt-2 space-y-5 text-sm">
          <h2 className="text-lg font-bold text-green-400">How It Works</h2>

          <div>
            <h3 className="font-bold text-gray-200 mb-1">The Prediction Model</h3>
            <p className="text-gray-400">
              Each match is 10 frames. The model calculates a{' '}
              <span className="text-white">team strength</span> from their league performance, then
              uses a <span className="text-white">logistic function</span> to convert the strength
              gap between two teams into a frame-by-frame win probability. Matches are simulated by
              playing out all 10 frames with that probability.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-gray-200 mb-1">Season Simulation (Monte Carlo)</h3>
            <p className="text-gray-400">
              Runs <span className="text-white">1,000 simulated seasons</span> from the current
              standings. Each run plays out every remaining fixture using the prediction model, then
              records where each team finishes. The results show how often a team wins the title,
              finishes top 2 (promotion), or bottom 2 (relegation) across all 1,000 runs.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-gray-200 mb-1">Points System</h3>
            <p className="text-gray-400">
              <span className="text-white">Home win = 2 pts</span>,{' '}
              <span className="text-white">Away win = 3 pts</span>,{' '}
              <span className="text-white">Draw = 1 pt each</span>. Away wins are worth more to
              reward overcoming home advantage.
            </p>
          </div>

          <h2 className="text-lg font-bold text-green-400 pt-2">Glossary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="font-medium text-blue-300">Team Strength</div>
                <p className="text-gray-400 text-xs">
                  Calculated from a team&apos;s average frame differential per match:{' '}
                  <span className="text-gray-300 font-mono">
                    (frames for - frames against) / matches / 10 x 2
                  </span>
                  . Positive means the team wins more frames than it loses on average.
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-300">Home Advantage (+{homeAdvPct}%)</div>
                <p className="text-gray-400 text-xs">
                  A fixed bonus applied to the home team&apos;s strength in every prediction.
                  Translates to roughly a {homeAdvPct} percentage point increase in the probability
                  of winning each frame.
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-300">24/25 Rating</div>
                <p className="text-gray-400 text-xs">
                  A pre-computed Bayesian player rating from last season (24/25). Ranges from about
                  -1.8 to +1.7. Positive values indicate a strong player who won more frames than
                  average; negative values indicate below average. Players with no 24/25 data
                  default to -0.20.
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-300">25/26 Win%</div>
                <p className="text-gray-400 text-xs">
                  The percentage of frames a player has won this season (25/26). Calculated as{' '}
                  <span className="text-gray-300 font-mono">
                    frames won / frames played x 100
                  </span>
                  . Shown alongside the number of games played for context.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="font-medium text-blue-300">Title% / Top2% / Bot2%</div>
                <p className="text-gray-400 text-xs">
                  From the season simulation: the percentage of 1,000 simulated seasons where a team
                  finishes 1st (Title), in the top 2 (promotion zone), or in the bottom 2
                  (relegation zone).
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-300">Pred (Predicted Points)</div>
                <p className="text-gray-400 text-xs">
                  The average total points a team accumulates across all 1,000 simulated seasons,
                  combining current real points with simulated remaining fixtures.
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-300">Squad Builder Adjustment</div>
                <p className="text-gray-400 text-xs">
                  When you add or remove players in the What If tab, the model recalculates the
                  team&apos;s average player win% and applies the change (multiplied by a scaling
                  factor) as an adjustment to the team&apos;s strength in simulations. The{' '}
                  <span className="text-gray-300">Lineup Size</span> filter (5-10) controls how many
                  of the squad&apos;s best players are used in the calculation.
                </p>
              </div>
              <div>
                <div className="font-medium text-blue-300">Cup Badge</div>
                <p className="text-gray-400 text-xs">
                  Shown next to a player&apos;s name when they appear to have played cup (non-league)
                  games for a team they aren&apos;t rostered to. Cup appearances are tracked but
                  don&apos;t affect league predictions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
