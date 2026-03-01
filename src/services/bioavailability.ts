import type { FoodItem, BioavailabilityInfo } from '../types/food';

// Dietary Impact Score (1–10): how much of the listed potassium is absorbed.
// Higher = more impact on serum potassium → more caution needed for CKD.
// Lower = safer (less absorbed).

const CATEGORY_BASE_SCORES: Record<string, number> = {
  'Beef Products': 9,
  'Poultry Products': 9,
  'Finfish and Shellfish Products': 9,
  'Lamb, Veal, and Game Products': 9,
  'Pork Products': 9,
  'Sausages and Luncheon Meats': 8,
  'Dairy and Egg Products': 8,
  'Fruits and Fruit Juices': 7,
  'Legumes and Legume Products': 7,
  'Beverages': 6,
  'Vegetables and Vegetable Products': 6,
  'Fast Foods': 6,
  'Meals, Entrees, and Side Dishes': 6,
  'Snacks': 5,
  'Sweets': 5,
  'Soups, Sauces, and Gravies': 5,
  'Baby Foods': 5,
  'Baked Products': 4,
  'Cereal Grains and Pasta': 4,
  'Breakfast Cereals': 4,
  'Nut and Seed Products': 3,
  'Spices and Herbs': 3,
  'Fats and Oils': 3,
};

// Fraction of listed potassium estimated to be absorbed at each score level.
const SCORE_TO_FRACTION: Record<number, number> = {
  10: 0.92, 9: 0.87, 8: 0.80, 7: 0.70,
  6: 0.62,  5: 0.55, 4: 0.45, 3: 0.37, 2: 0.30, 1: 0.25,
};

interface KeywordEffect {
  delta: number;
  tip?: string;
}

function getKeywordEffect(desc: string): KeywordEffect {
  const d = desc.toLowerCase();

  if (d.includes('potassium chloride') || d.includes('no salt') || d.includes('lite salt') || d.includes('low-sodium salt')) {
    return {
      delta: +2,
      tip: 'Contains potassium chloride (KCl), a salt substitute that is nearly 100% bioavailable. The actual dietary potassium impact is likely higher than the label value.',
    };
  }
  if ((d.includes('boil') || d.includes('cook')) && (d.includes('drain') || d.includes('water'))) {
    return {
      delta: -2,
      tip: 'Boiling and draining vegetables can remove an additional 30–50% of potassium beyond what USDA data already reflects.',
    };
  }
  if (d.includes('boil') || d.includes('cooked')) {
    return {
      delta: -1,
      tip: 'Cooking with discarded water can further reduce potassium. Boiling and draining is especially effective.',
    };
  }
  if (d.includes('canned') || d.includes('in water') || d.includes('in juice')) {
    return {
      delta: -1,
      tip: 'Draining and rinsing canned foods can reduce potassium by 10–30%.',
    };
  }
  if (d.includes('juice') && !d.includes('fruit juice')) {
    return { delta: +1 };
  }
  return { delta: 0 };
}

function buildRationale(food: FoodItem, score: number): string {
  const cat = food.foodCategory ?? '';
  const d = food.description.toLowerCase();

  if (['Beef Products', 'Poultry Products', 'Finfish and Shellfish Products',
       'Lamb, Veal, and Game Products', 'Pork Products'].includes(cat)) {
    return 'Animal muscle tissue — potassium is intracellular and highly bioavailable with no fiber or phytate barriers.';
  }
  if (cat === 'Sausages and Luncheon Meats') {
    return 'Processed animal protein — potassium from meat is highly bioavailable; added KCl in some products elevates impact further.';
  }
  if (cat === 'Dairy and Egg Products') {
    return 'Dairy potassium is dissolved in a liquid matrix, making it readily absorbed.';
  }
  if (cat === 'Fruits and Fruit Juices') {
    return d.includes('juice')
      ? 'Fruit juice — liquid medium increases absorption rate compared to whole fruit.'
      : 'Fresh fruit — potassium is moderately bioavailable; fructose and fiber modestly slow absorption.';
  }
  if (cat === 'Legumes and Legume Products') {
    return 'Cooked legumes — phytates partially reduce bioavailability, but cooking degrades anti-nutritive factors, resulting in moderate absorption.';
  }
  if (cat === 'Vegetables and Vegetable Products') {
    return d.includes('boil') || d.includes('cook')
      ? 'Cooked vegetable — cell walls partially broken down; potassium leaches into cooking water, reducing total content and bioavailability.'
      : 'Raw vegetable — intact cell walls and fiber moderate potassium absorption.';
  }
  if (['Cereal Grains and Pasta', 'Breakfast Cereals', 'Baked Products'].includes(cat)) {
    return 'Grain-based food — phytic acid (phytate) in bran binds potassium, reducing net absorption.';
  }
  if (cat === 'Nut and Seed Products') {
    return 'Nuts and seeds — phytates and fiber significantly reduce potassium bioavailability.';
  }
  if (score >= 7) {
    return 'Potassium in this food is likely highly bioavailable based on its composition.';
  }
  if (score >= 5) {
    return 'Estimated moderate bioavailability based on food type and composition.';
  }
  return 'Estimated lower bioavailability — plant-based or grain-based matrix reduces potassium absorption.';
}

export function calculateBioavailability(food: FoodItem): BioavailabilityInfo {
  let baseScore = CATEGORY_BASE_SCORES[food.foodCategory ?? ''] ?? 5;
  const { delta, tip } = getKeywordEffect(food.description);
  const score = Math.max(1, Math.min(10, baseScore + delta));

  const fraction = SCORE_TO_FRACTION[score] ?? 0.55;
  const effectivePotassiumPer100g = Math.round(food.potassium * fraction);

  const tier: BioavailabilityInfo['tier'] =
    score <= 4 ? 'low' : score <= 6 ? 'moderate' : 'high';

  const tierLabel = { low: 'Low', moderate: 'Moderate', high: 'High' }[tier];
  const label = `${tierLabel} Impact (${score}/10)`;

  return {
    score,
    tier,
    label,
    rationale: buildRationale(food, score),
    tip,
    bioavailabilityFraction: fraction,
    effectivePotassiumPer100g,
  };
}
