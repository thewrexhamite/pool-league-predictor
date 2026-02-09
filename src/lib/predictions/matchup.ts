import { HOME_ADV } from '../data';

/**
 * Predicts the probability of the home player winning a single frame
 * using a logistic model with home advantage adjustment.
 *
 * @param homeStr - Home player/team strength
 * @param awayStr - Away player/team strength
 * @returns Probability of home player winning (0-1)
 */
export function predictFrame(homeStr: number, awayStr: number): number {
  const adjH = homeStr + HOME_ADV;
  return 1 / (1 + Math.exp(-(adjH - awayStr)));
}
