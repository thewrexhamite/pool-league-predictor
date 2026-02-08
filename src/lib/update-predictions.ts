import { collection, query, where, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { PredictionSnapshot, MatchResult } from './types';

/**
 * Update stored predictions with actual match results
 * This should be called after results are synced to match predictions with outcomes
 *
 * @param results Array of match results to process
 * @param seasonId Season ID to filter predictions
 * @returns Promise resolving to number of predictions updated
 */
export async function updatePredictionsWithResults(
  results: MatchResult[],
  seasonId: string = '2025-26'
): Promise<number> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.warn('Firebase not configured, skipping prediction updates');
    return 0;
  }

  try {
    const { db } = await import('./firebase');
    const predictionsRef = collection(db, 'predictions');

    // Fetch all predictions for this season
    // Note: Filter for missing results in JavaScript since Firestore
    // doesn't reliably query for null/undefined fields
    const q = query(
      predictionsRef,
      where('seasonId', '==', seasonId),
      orderBy('predictedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const predictions = snapshot.docs
      .map(doc => ({
        docId: doc.id,
        ...doc.data() as PredictionSnapshot
      }))
      .filter(p => p.actualWinner === undefined || p.actualWinner === null);

    let updatedCount = 0;

    // Match predictions to results
    for (const result of results) {
      // Find predictions for this match
      const matchingPredictions = predictions.filter(
        p => p.home === result.home && p.away === result.away && p.date === result.date
      );

      for (const prediction of matchingPredictions) {
        // Determine actual winner
        let actualWinner: 'home' | 'away' | 'draw';
        if (result.homeScore > result.awayScore) {
          actualWinner = 'home';
        } else if (result.awayScore > result.homeScore) {
          actualWinner = 'away';
        } else {
          actualWinner = 'draw';
        }

        // Check if prediction was correct
        const correct = prediction.predictedWinner === actualWinner;

        // Update the prediction document
        const docRef = doc(db, 'predictions', prediction.docId);
        await updateDoc(docRef, {
          actualHomeScore: result.homeScore,
          actualAwayScore: result.awayScore,
          actualWinner,
          correct,
        });

        updatedCount++;
      }
    }

    return updatedCount;
  } catch (error) {
    console.error('Failed to update predictions with results:', error);
    throw error;
  }
}

/**
 * Manually update a single prediction with a result
 * Useful for testing and verification
 *
 * @param predictionId The prediction document ID
 * @param actualHomeScore The actual home team score
 * @param actualAwayScore The actual away team score
 */
export async function updateSinglePrediction(
  predictionId: string,
  actualHomeScore: number,
  actualAwayScore: number
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    throw new Error('Firebase not configured');
  }

  try {
    const { db } = await import('./firebase');

    // Fetch the prediction
    const docRef = doc(db, 'predictions', predictionId);
    const predDoc = await getDoc(docRef);

    if (!predDoc.exists()) {
      throw new Error(`Prediction ${predictionId} not found`);
    }

    const prediction = predDoc.data() as PredictionSnapshot;

    // Determine actual winner
    let actualWinner: 'home' | 'away' | 'draw';
    if (actualHomeScore > actualAwayScore) {
      actualWinner = 'home';
    } else if (actualAwayScore > actualHomeScore) {
      actualWinner = 'away';
    } else {
      actualWinner = 'draw';
    }

    // Check if prediction was correct
    const correct = prediction.predictedWinner === actualWinner;

    // Update the prediction
    await updateDoc(docRef, {
      actualHomeScore,
      actualAwayScore,
      actualWinner,
      correct,
    });
  } catch (error) {
    console.error('Failed to update prediction:', error);
    throw error;
  }
}
