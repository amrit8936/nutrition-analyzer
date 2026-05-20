const DEFAULT_API = 'https://api.example.com/nutrition';
async function fetchNutritionData({ barcode, meal }) {
  if (!barcode && !meal) {
    throw new Error('Provide either a barcode or a meal description.');
  }
  const params = new URLSearchParams();
  if (barcode) params.set('barcode', barcode);
  if (meal) params.set('meal', meal);
  const url = `${DEFAULT_API}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nutrition API request failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return {
    calories: data.calories ?? data.energy_kcal ?? 0,
    protein: data.protein_g ?? data.protein ?? 0,
    fat: data.fat_g ?? data.fat ?? 0,
    raw: data,
  };
}
async function logMeal({ barcode, meal }) {
  const nutrition = await fetchNutritionData({ barcode, meal });
  const entry = {
    timestamp: new Date().toISOString(),
    barcode: barcode || null,
    meal: meal || null,
    calories: nutrition.calories,
    protein: nutrition.protein,
    fat: nutrition.fat,
  };
  console.log('Meal logged successfully:');
  console.table(entry);
  return entry;
}
async function main() {
  const args = process.argv.slice(2);
  const barcodeArg = args.find(arg => arg.startsWith('--barcode='));
  const mealArg = args.find(arg => arg.startsWith('--meal='));
  const barcode = barcodeArg ? barcodeArg.replace('--barcode=', '') : null;
  const meal = mealArg ? mealArg.replace('--meal=', '') : null;
  try {
    await logMeal({ barcode, meal });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
if (require.main === module) {
  main();
}
