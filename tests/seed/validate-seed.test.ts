import { describe, expect, it } from 'vitest';

// The seed tool is plain ESM so it can run on supported Node versions without
// adding a TypeScript runtime dependency.
// @ts-expect-error -- the executable seed module intentionally has no TS build step
import { buildSeedDataset, validateSeedDataset } from '../../scripts/seed-data.mjs';

describe('seed corpus', () => {
  it('meets the MVP volume and mapping gates', () => {
    const dataset = buildSeedDataset();
    const result = validateSeedDataset(dataset);

    expect(result.errors).toEqual([]);
    expect(dataset.masters.length).toBeGreaterThanOrEqual(300);
    expect(dataset.aliases.length).toBeGreaterThanOrEqual(1_000);
    expect(dataset.recipes.length).toBeGreaterThanOrEqual(80);
    expect(dataset.recipeIngredients.length).toBeGreaterThanOrEqual(240);
  });

  it('rejects aliases that reference a missing master', () => {
    const dataset = buildSeedDataset();
    dataset.aliases[0] = { ...dataset.aliases[0], masterId: 'missing-master' };

    expect(validateSeedDataset(dataset).errors).toContain(
      'alias references missing master: missing-master',
    );
  });

  it('rejects duplicate aliases within the same language', () => {
    const dataset = buildSeedDataset();
    dataset.aliases.push({ ...dataset.aliases[0] });

    expect(validateSeedDataset(dataset).errors).toContain(
      `duplicate alias: ${dataset.aliases[0].alias}/ko`,
    );
  });

  it('rejects recipe ingredients that cannot map to a master', () => {
    const dataset = buildSeedDataset();
    dataset.recipeIngredients[0] = {
      ...dataset.recipeIngredients[0],
      masterId: 'missing-master',
    };

    expect(validateSeedDataset(dataset).errors).toContain(
      'recipe ingredient references missing master: missing-master',
    );
  });

  it('requires every recipe to have at least one non-optional ingredient', () => {
    const dataset = buildSeedDataset();
    const recipeId = dataset.recipes[0].id;
    dataset.recipeIngredients = dataset.recipeIngredients.filter(
      (ingredient: { recipeId: string }) => ingredient.recipeId !== recipeId,
    );

    expect(validateSeedDataset(dataset).errors).toContain(
      `recipe has no required ingredients: ${recipeId}`,
    );
  });
});

