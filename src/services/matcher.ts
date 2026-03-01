import type { FoodItem, FoodResult } from '../types/food';
import { searchCandidates } from './usda';
import { calculateBioavailability } from './bioavailability';

function similarityScore(target: FoodItem, candidate: FoodItem): number {
  const proteinDiff  = Math.abs(target.protein  - candidate.protein)  * 1.5;
  const carbsDiff    = Math.abs(target.carbs    - candidate.carbs)    * 1.0;
  const fatDiff      = Math.abs(target.fat      - candidate.fat)      * 1.5;
  const kReduction   = (target.potassium - candidate.potassium) / Math.max(target.potassium, 1);
  const kBonus       = -50 * kReduction;
  return proteinDiff + carbsDiff + fatDiff + kBonus;
}

function generateSearchTerms(desc: string): string[] {
  const d = desc.toLowerCase();
  const terms: string[] = [];

  const map: [string[], string[]][] = [
    [['cracker','chip','crisp','pretzel','snack'],  ['crackers','rice cakes','pretzels','popcorn']],
    [['apple','pear','grape','berry','melon'],       ['apple','blueberries','grapes','pear']],
    [['banana','potato','tomato','avocado','spinach'],['apple','cucumber','lettuce','rice cakes']],
    [['carrot','broccoli','vegetable','salad','pepper'],['cucumber','lettuce','cabbage','green beans']],
    [['chicken','turkey','poultry'],                ['chicken breast','turkey breast']],
    [['beef','steak','hamburger','ground beef'],    ['lean beef','chicken breast']],
    [['fish','salmon','tuna','cod'],                ['fish','tilapia','cod']],
    [['pork','ham','bacon'],                        ['pork tenderloin','turkey']],
    [['milk','yogurt','dairy'],                     ['milk','yogurt','cottage cheese']],
    [['cheese'],                                    ['cheese','cream cheese','ricotta']],
    [['bread','roll','bun','bagel'],                ['white bread','pita','english muffin']],
    [['pasta','noodle','spaghetti'],                ['pasta','rice noodles','couscous']],
    [['rice'],                                      ['white rice','pasta']],
    [['cereal','oat','granola'],                    ['rice cereal','corn flakes','grits']],
    [['juice','drink','beverage','soda'],           ['apple juice','cranberry juice','lemonade']],
    [['bean','lentil','pea'],                       ['green beans','canned beans','peas']],
    [['nut','almond','walnut','peanut'],             ['macadamia nuts','white rice','crackers']],
  ];

  for (const [triggers, extras] of map) {
    if (triggers.some(t => d.includes(t))) terms.push(...extras);
  }
  if (terms.length === 0) terms.push('rice', 'chicken', 'apple', 'crackers', 'cucumber');

  return [...new Set(terms)];
}

export async function findAlternatives(target: FoodItem, maxResults = 5): Promise<FoodResult[]> {
  const terms   = generateSearchTerms(target.description).slice(0, 4);
  const seen    = new Set<string>([target.description.toLowerCase()]);
  const pool: FoodItem[] = [];

  for (const term of terms) {
    const candidates = await searchCandidates(term, target.potassium, seen);
    for (const c of candidates) {
      if (!seen.has(c.description.toLowerCase())) {
        pool.push(c);
        seen.add(c.description.toLowerCase());
      }
    }
    if (pool.length >= maxResults * 3) break;
  }

  // Fallback if not enough candidates
  if (pool.length < maxResults) {
    const broader = await searchCandidates('low potassium food', target.potassium, seen);
    for (const c of broader) {
      if (!seen.has(c.description.toLowerCase())) {
        pool.push(c);
        seen.add(c.description.toLowerCase());
      }
    }
  }

  // Score and sort
  const scored = pool
    .map(food => ({ food, score: similarityScore(target, food) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, maxResults);

  return scored.map(({ food }) => ({
    food,
    bioavailability: calculateBioavailability(food),
    potassiumReductionMg:  Math.round(target.potassium - food.potassium),
    potassiumReductionPct: Math.round(((target.potassium - food.potassium) / Math.max(target.potassium, 1)) * 100),
  }));
}
