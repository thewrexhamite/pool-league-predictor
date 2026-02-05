'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { HOME_ADV } from '@/lib/data';

export default function Glossary() {
  const [showGlossary, setShowGlossary] = useState(false);
  const homeAdvPct = (1 / (1 + Math.exp(-HOME_ADV)) * 100 - 50).toFixed(0);

  return (
    <div className="mt-8">
      <button
        onClick={() => setShowGlossary(!showGlossary)}
        className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 text-sm py-2 transition"
      >
        <BookOpen size={16} />
        {showGlossary ? 'Hide' : 'Show'} How It Works &amp; Glossary
        <ChevronDown size={16} className={clsx('transition-transform', showGlossary && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {showGlossary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6 mt-2 space-y-5 text-sm">
              <h2 className="text-lg font-bold text-baize">How It Works</h2>

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

              <div>
                <h3 className="font-bold text-gray-200 mb-1">Confidence-Adjusted Win% (Adj%)</h3>
                <p className="text-gray-400">
                  Raw win% can be misleading with small samples &mdash; a player at 3/3 (100%) isn&apos;t necessarily
                  better than one at 30/40 (75%). The model applies{' '}
                  <span className="text-white">Bayesian regression toward 50%</span> using the formula:{' '}
                  <span className="text-gray-300 font-mono">adj = (wins + 6 &times; 0.5) / (games + 6)</span>.
                  This pulls small samples toward the mean while leaving large samples mostly unchanged.
                  All rankings, squad strength calculations, and lineup suggestions use adjusted percentages.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-surface/50 rounded p-2">
                    <div className="text-gray-500">3 wins / 3 games</div>
                    <div>Raw: <span className="text-white">100%</span> &rarr; Adj: <span className="text-accent-light">66.7%</span></div>
                  </div>
                  <div className="bg-surface/50 rounded p-2">
                    <div className="text-gray-500">30 wins / 40 games</div>
                    <div>Raw: <span className="text-white">75%</span> &rarr; Adj: <span className="text-accent-light">71.7%</span></div>
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-bold text-baize pt-2">Glossary</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="font-medium text-info">Team Strength</div>
                    <p className="text-gray-400 text-xs">
                      Calculated from a team&apos;s average frame differential per match:{' '}
                      <span className="text-gray-300 font-mono">
                        (frames for - frames against) / matches / 10 x 2
                      </span>
                      . Positive means the team wins more frames than it loses on average.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Home Advantage (+{homeAdvPct}%)</div>
                    <p className="text-gray-400 text-xs">
                      A fixed bonus applied to the home team&apos;s strength in every prediction.
                      Translates to roughly a {homeAdvPct} percentage point increase in the probability
                      of winning each frame.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">24/25 Rating</div>
                    <p className="text-gray-400 text-xs">
                      A pre-computed Bayesian player rating from last season (24/25). Ranges from about
                      -1.8 to +1.7. Positive values indicate a strong player; negative values indicate
                      below average. Players with no 24/25 data default to -0.20.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">25/26 Win%</div>
                    <p className="text-gray-400 text-xs">
                      The percentage of frames a player has won this season (25/26). Calculated as{' '}
                      <span className="text-gray-300 font-mono">
                        frames won / frames played x 100
                      </span>.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Adjusted Win% (Adj%)</div>
                    <p className="text-gray-400 text-xs">
                      Bayesian confidence-adjusted win percentage. Pulls small samples toward 50%
                      so that a player with few games doesn&apos;t dominate rankings due to luck.
                      Used as the primary ranking metric across all views.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Player Form (Hot / Cold / Steady)</div>
                    <p className="text-gray-400 text-xs">
                      Compares a player&apos;s last 5 frame results to their season average.
                      Hot = last 5 win% is 15+ percentage points above average.
                      Cold = 15+ below. Steady = within 15pp.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Break &amp; Dish (BD+ / BD-)</div>
                    <p className="text-gray-400 text-xs">
                      BD frames won (BD+) and conceded (BD-) per game. Net BD is the differential.
                      A high BD+ rate indicates strong break-off play.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Home / Away Split</div>
                    <p className="text-gray-400 text-xs">
                      Venue-specific win percentages. Some players or teams perform significantly
                      differently at home vs away. Used in lineup suggestions.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Set Performance (Set 1 / Set 2)</div>
                    <p className="text-gray-400 text-xs">
                      Win percentage in the first 5 frames (Set 1) vs the last 5 frames (Set 2).
                      Early bias = stronger in Set 1. Late bias = stronger in Set 2.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Head-to-Head (H2H)</div>
                    <p className="text-gray-400 text-xs">
                      Historical player-vs-player win/loss record within the current season&apos;s
                      frame data. Shown as a matrix in the Predict tab.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Forfeit Rate (Forf)</div>
                    <p className="text-gray-400 text-xs">
                      Forfeited frames per game. A high rate suggests availability issues
                      that may affect team strength in simulations.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Core / Rotation / Fringe</div>
                    <p className="text-gray-400 text-xs">
                      Player appearance classification based on match appearance rate.
                      Core = 80%+ of matches. Rotation = 40&ndash;80%. Fringe = below 40%.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="font-medium text-info">Title% / Top2% / Bot2%</div>
                    <p className="text-gray-400 text-xs">
                      From the season simulation: the percentage of 1,000 simulated seasons where a team
                      finishes 1st (Title), in the top 2 (promotion zone), or in the bottom 2
                      (relegation zone).
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Pred (Predicted Points)</div>
                    <p className="text-gray-400 text-xs">
                      The average total points a team accumulates across all 1,000 simulated seasons,
                      combining current real points with simulated remaining fixtures.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Predicted Lineup</div>
                    <p className="text-gray-400 text-xs">
                      The opponent&apos;s most likely lineup based on their last 3 match appearances.
                      Players who appeared in at least 2 of 3 are considered likely starters.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Lineup Suggester</div>
                    <p className="text-gray-400 text-xs">
                      Recommends your optimal lineup using a composite score: adjusted win% (base) +
                      form adjustment (30%) + H2H advantage (+5 per head-to-head win) +
                      venue-specific performance (20%).
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Must-Win Fixture</div>
                    <p className="text-gray-400 text-xs">
                      Fixture importance measured as the difference in Top 2% finish probability
                      between a win and a loss scenario. Higher values mean the result has a
                      larger impact on the team&apos;s season outcome.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Scouting Report</div>
                    <p className="text-gray-400 text-xs">
                      Pre-match summary of an opponent including: recent form, home/away splits,
                      set performance, B&amp;D stats, and their strongest/weakest players by adjusted win%.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">What-If Scenario</div>
                    <p className="text-gray-400 text-xs">
                      Lock specific match results to see how they impact simulation projections.
                      Locked results are treated as completed when running simulations.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Squad Builder</div>
                    <p className="text-gray-400 text-xs">
                      Add or remove players from a team&apos;s squad to see how it affects their
                      strength rating. Strength is calculated from the top N players by adjusted win%.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Time Machine</div>
                    <p className="text-gray-400 text-xs">
                      Pick a historical match date to view the league as it stood at that point.
                      Standings, player stats, and simulations all reflect the selected date.
                      Player stats are reconstructed from frame-level data.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Season Progress</div>
                    <p className="text-gray-400 text-xs">
                      Percentage of scheduled fixtures that have been completed.
                      Calculated as played / (played + remaining) across all divisions.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Cup Badge</div>
                    <p className="text-gray-400 text-xs">
                      Shown next to a player&apos;s name when they appear to have played cup games
                      for a team they aren&apos;t rostered to. Cup appearances don&apos;t affect league predictions.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium text-info">Squad Strength Adjustment</div>
                    <p className="text-gray-400 text-xs">
                      When you modify a squad in the Squad Builder, the model recalculates the
                      team&apos;s average player adjusted win% and applies the change to
                      the team&apos;s strength in simulations and predictions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
