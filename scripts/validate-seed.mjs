import { buildSeedDataset, validateSeedDataset } from './seed-data.mjs';

const dataset = buildSeedDataset();
const result = validateSeedDataset(dataset);

if (result.errors.length > 0) {
  for (const error of result.errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    valid: true,
    masters: dataset.masters.length,
    aliases: dataset.aliases.length,
    substitutions: dataset.substitutions.length,
    recipes: dataset.recipes.length,
    recipeIngredients: dataset.recipeIngredients.length
  }));
}

