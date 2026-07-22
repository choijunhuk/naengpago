import { describe, expect, it } from 'vitest';

import { confirmReviewDraft, createReviewDraft } from '../../src/domain/review';
import { mockAnalysisItems, mockInventory } from '../../src/domain/mock-data';

describe('analysis review', () => {
  it('keeps low-confidence candidates unchecked until the user confirms them', () => {
    const draft = createReviewDraft(mockAnalysisItems, 'storage-fridge');
    const uncertain = draft.find((candidate) => candidate.confidence < 0.5);

    expect(uncertain?.selected).toBe(false);
  });

  it('treats edited final payload as the inventory source of truth', () => {
    const draft = createReviewDraft(mockAnalysisItems, 'storage-fridge');
    const edited = draft.map((candidate) =>
      candidate.id === 'candidate-egg'
        ? {
            ...candidate,
            displayName: '달걀',
            quantity: 8,
            selected: true,
            duplicateAction: 'REPLACE' as const,
          }
        : candidate,
    );
    const result = confirmReviewDraft(edited, mockInventory, 'user-demo');
    const egg = result.updated.find((item) => item.displayName === '달걀');

    expect(egg?.quantity).toBe(8);
    expect(result.finalPayloads.find((payload) => payload.candidateId === 'candidate-egg')?.quantity).toBe(8);
  });

  it('supports add, separate, replace and ignore duplicate decisions', () => {
    const draft = createReviewDraft(mockAnalysisItems, 'storage-fridge');
    const milk = draft.find((candidate) => candidate.id === 'candidate-milk');
    expect(milk?.duplicateOfItemId).toBe('inventory-milk');

    const added = confirmReviewDraft(
      draft.map((candidate) =>
        candidate.id === 'candidate-milk' ? { ...candidate, duplicateAction: 'ADD' as const } : candidate,
      ),
      mockInventory,
      'user-demo',
    );
    expect(added.updated.find((item) => item.id === 'inventory-milk')?.quantity).toBe(2);

    const ignored = confirmReviewDraft(
      draft.map((candidate) =>
        candidate.id === 'candidate-milk' ? { ...candidate, duplicateAction: 'IGNORE' as const } : candidate,
      ),
      mockInventory,
      'user-demo',
    );
    expect(ignored.updated.some((item) => item.id === 'inventory-milk')).toBe(false);
  });
});
