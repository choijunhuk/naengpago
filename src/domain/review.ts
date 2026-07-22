import type { InventoryItem, ReviewCandidate } from './models';

import type { AnalysisCandidateInput } from './models';

export function createReviewDraft(
  candidates: AnalysisCandidateInput[],
  storageLocationId: string,
): ReviewCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    selected: candidate.confidence >= 0.5,
    quantity: candidate.quantityType === 'COUNTABLE' ? candidate.estimatedCount : null,
    storageLocationId,
    expirationDate: null,
    duplicateAction: candidate.duplicateOfItemId ? 'ADD' : 'SEPARATE',
  }));
}

export interface ReviewConfirmation {
  created: InventoryItem[];
  updated: InventoryItem[];
  finalPayloads: Array<{
    candidateId: string;
    displayName: string;
    quantity: number | null;
    remainingLevel: ReviewCandidate['remainingLevel'];
    storageLocationId: string;
    expirationDate: string | null;
    action: ReviewCandidate['duplicateAction'];
  }>;
}

export function confirmReviewDraft(
  draft: ReviewCandidate[],
  inventory: InventoryItem[],
  userId: string,
): ReviewConfirmation {
  const created: InventoryItem[] = [];
  const updated: InventoryItem[] = [];
  const finalPayloads: ReviewConfirmation['finalPayloads'] = [];
  const now = new Date().toISOString();

  for (const candidate of draft.filter((item) => item.selected)) {
    finalPayloads.push({
      candidateId: candidate.id,
      displayName: candidate.displayName,
      quantity: candidate.quantity,
      remainingLevel: candidate.remainingLevel,
      storageLocationId: candidate.storageLocationId,
      expirationDate: candidate.expirationDate,
      action: candidate.duplicateAction,
    });
    if (candidate.duplicateAction === 'IGNORE') continue;

    const duplicate = candidate.duplicateOfItemId
      ? inventory.find((item) => item.id === candidate.duplicateOfItemId)
      : undefined;
    if (duplicate && candidate.duplicateAction !== 'SEPARATE') {
      updated.push({
        ...duplicate,
        quantity:
          candidate.duplicateAction === 'ADD'
            ? (duplicate.quantity ?? 0) + (candidate.quantity ?? 0)
            : candidate.quantity,
        remainingLevel:
          candidate.quantityType === 'LEVEL' ? candidate.remainingLevel : duplicate.remainingLevel,
        expirationDate: candidate.expirationDate ?? duplicate.expirationDate,
        updatedAt: now,
      });
      continue;
    }

    created.push({
      id: `inventory-${candidate.id}`,
      masterId: candidate.matchedMasterId,
      displayName: candidate.displayName,
      category: candidate.category,
      quantityType: candidate.quantityType,
      quantity: candidate.quantity,
      unit: candidate.unit,
      remainingLevel: candidate.remainingLevel,
      remainingPercent: null,
      storageLocationId: candidate.storageLocationId,
      expirationDate: candidate.expirationDate,
      registeredVia: 'IMAGE_AI',
      imageUri: null,
      aiConfidence: candidate.confidence,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { created, updated, finalPayloads };
}
