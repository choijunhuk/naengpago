import { describe, expect, it } from 'vitest';

import { rankRecipes } from '../../src/domain/recommendation';
import { mockInventory, mockRecipes } from '../../src/domain/mock-data';

describe('recipe recommendation', () => {
  it('prioritizes recipes that consume expiring ingredients', () => {
    const ranked = rankRecipes(mockRecipes, mockInventory, {
      mode: 'EXPIRING',
      now: new Date('2026-07-22T09:00:00+09:00'),
      likedTags: ['한식', '국물'],
      dislikedMasterIds: [],
      allergyMasterIds: [],
      ownedTools: ['냄비', '프라이팬'],
      favoriteRecipeIds: [],
    });

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]?.expiringIngredientNames).toContain('두부');
    expect(ranked[0]?.reason).toContain('두부');
  });

  it('classifies substitution separately from a missing ingredient', () => {
    const ranked = rankRecipes(mockRecipes, mockInventory, {
      mode: 'ALMOST',
      now: new Date('2026-07-22T09:00:00+09:00'),
      likedTags: [],
      dislikedMasterIds: [],
      allergyMasterIds: [],
      ownedTools: ['냄비', '프라이팬'],
      favoriteRecipeIds: [],
    });
    const pasta = ranked.find((entry) => entry.recipe.id === 'recipe-tomato-pasta');

    expect(pasta?.substitutions).toContainEqual({ requiredName: '스파게티면', ownedName: '파스타면' });
    expect(pasta?.missing).not.toContain('스파게티면');
  });

  it('excludes allergies and unavailable required tools', () => {
    const ranked = rankRecipes(mockRecipes, mockInventory, {
      mode: 'ALMOST',
      now: new Date('2026-07-22T09:00:00+09:00'),
      likedTags: [],
      dislikedMasterIds: [],
      allergyMasterIds: ['master-egg'],
      ownedTools: ['냄비'],
      favoriteRecipeIds: [],
    });

    expect(ranked.some((entry) => entry.recipe.name === '달걀볶음밥')).toBe(false);
    expect(ranked.every((entry) => entry.recipe.requiredTools.every((tool) => tool === '냄비'))).toBe(true);
  });
});

