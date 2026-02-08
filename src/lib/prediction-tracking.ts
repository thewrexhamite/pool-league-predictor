import { doc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type {
  PredictionSnapshot,
  AccuracyStats,
  AccuracyByDivision,
  AccuracyByConfidence,
  CalibrationBucket,
} from './types';

/**
 * Store a prediction snapshot in Firestore
 * @param prediction The prediction snapshot to store
 * @returns Promise that resolves when stored, or rejects on error
 */
export async function storePrediction(prediction: PredictionSnapshot): Promise<void> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    throw new Error('Firebase not configured');
  }

  try {
    const { db } = await import('./firebase');
    const docRef = doc(db, 'predictions', prediction.id);
    await setDoc(docRef, prediction);
  } catch (error) {
    console.error('Failed to store prediction:', error);
    throw error;
  }
}

/**
 * Retrieve predictions from Firestore, optionally filtered by season and/or division
 * @param seasonId Optional season ID to filter by
 * @param division Optional division to filter by
 * @returns Promise resolving to array of prediction snapshots
 */
export async function getPredictions(
  seasonId?: string,
  division?: string
): Promise<PredictionSnapshot[]> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return [];
  }

  try {
    const { db } = await import('./firebase');
    const predictionsRef = collection(db, 'predictions');

    let q = query(predictionsRef, orderBy('predictedAt', 'desc'));

    if (seasonId) {
      q = query(predictionsRef, where('seasonId', '==', seasonId), orderBy('predictedAt', 'desc'));
    }

    if (seasonId && division) {
      q = query(
        predictionsRef,
        where('seasonId', '==', seasonId),
        where('division', '==', division),
        orderBy('predictedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as PredictionSnapshot);
  } catch (error) {
    console.error('Failed to fetch predictions:', error);
    return [];
  }
}

/**
 * Calculate accuracy statistics from a set of predictions
 * @param predictions Array of prediction snapshots (must include actual results)
 * @returns AccuracyStats object with overall and breakdown metrics
 */
export function calculateAccuracy(predictions: PredictionSnapshot[]): AccuracyStats {
  // Filter to only predictions with actual results
  const completed = predictions.filter(p => p.actualWinner !== undefined && p.correct !== undefined);

  if (completed.length === 0) {
    return {
      totalPredictions: 0,
      correctPredictions: 0,
      overallAccuracy: 0,
      byDivision: [],
      byConfidence: [],
      calibration: [],
      lastUpdated: Date.now(),
    };
  }

  const totalPredictions = completed.length;
  const correctPredictions = completed.filter(p => p.correct === true).length;
  const overallAccuracy = correctPredictions / totalPredictions;

  // Group by division
  const divisionMap = new Map<string, { total: number; correct: number }>();
  for (const pred of completed) {
    const div = pred.division;
    const stats = divisionMap.get(div) || { total: 0, correct: 0 };
    stats.total++;
    if (pred.correct) stats.correct++;
    divisionMap.set(div, stats);
  }

  const byDivision: AccuracyByDivision[] = Array.from(divisionMap.entries()).map(([division, stats]) => ({
    division,
    total: stats.total,
    correct: stats.correct,
    accuracy: stats.correct / stats.total,
  }));

  // Group by confidence level
  const confidenceBuckets: Array<{
    label: string;
    minConfidence: number;
    maxConfidence: number;
  }> = [
    { label: 'High (>70%)', minConfidence: 0.7, maxConfidence: 1.0 },
    { label: 'Medium (50-70%)', minConfidence: 0.5, maxConfidence: 0.7 },
    { label: 'Low (<50%)', minConfidence: 0, maxConfidence: 0.5 },
  ];

  const byConfidence: AccuracyByConfidence[] = confidenceBuckets.map(bucket => {
    const inBucket = completed.filter(
      p => p.confidence >= bucket.minConfidence && p.confidence < bucket.maxConfidence
    );
    const correctInBucket = inBucket.filter(p => p.correct === true).length;

    return {
      label: bucket.label,
      minConfidence: bucket.minConfidence,
      maxConfidence: bucket.maxConfidence,
      total: inBucket.length,
      correct: correctInBucket,
      accuracy: inBucket.length > 0 ? correctInBucket / inBucket.length : 0,
    };
  });

  const calibration = calculateCalibration(completed);

  return {
    totalPredictions,
    correctPredictions,
    overallAccuracy,
    byDivision,
    byConfidence,
    calibration,
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate calibration buckets to check if predicted probabilities match actual outcomes
 * @param predictions Array of completed prediction snapshots
 * @returns Array of calibration buckets showing predicted vs actual win rates
 */
export function calculateCalibration(predictions: PredictionSnapshot[]): CalibrationBucket[] {
  // Define calibration buckets (10% intervals)
  const buckets: CalibrationBucket[] = [];
  for (let i = 0; i < 10; i++) {
    buckets.push({
      minConfidence: i / 10,
      maxConfidence: (i + 1) / 10,
      predictedRate: (i + 0.5) / 10,
      actualRate: 0,
      count: 0,
    });
  }

  // Assign predictions to buckets
  for (const pred of predictions) {
    const bucketIndex = Math.min(Math.floor(pred.confidence * 10), 9);
    const bucket = buckets[bucketIndex];
    bucket.count++;

    // For calibration, we check if the predicted winner actually won
    if (pred.correct === true) {
      bucket.actualRate += 1;
    }
  }

  // Calculate actual rates
  for (const bucket of buckets) {
    if (bucket.count > 0) {
      bucket.actualRate = bucket.actualRate / bucket.count;
    }
  }

  // Filter out empty buckets
  return buckets.filter(b => b.count > 0);
}
