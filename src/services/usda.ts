import type { FoodItem } from '../types/food';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const API_KEY = (import.meta.env.VITE_USDA_API_KEY as string | undefined) ?? 'DEMO_KEY';

// Simple in-memory cache (10-minute TTL)
const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 10 * 60 * 1000;

function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  cache.delete(key);
  return undefined;
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, expires: Date.now() + TTL });
}

// USDA nutrient IDs
const NID = {
  energy:  1008,
  protein: 1003,
  carbs:   1005,
  fat:     1004,
  water:   1051,
  potassium: 1092,
} as const;

interface RawNutrient {
  nutrientId?: number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
}

function extractNutrients(raw: RawNutrient[]) {
  const n = { calories: 0, protein: 0, carbs: 0, fat: 0, water: null as number | null, potassium: 0 };
  for (const r of raw) {
    const id = r.nutrientId ?? 0;
    const name = (r.nutrientName ?? '').toLowerCase();
    const v = r.value ?? 0;
    if (id === NID.energy   || (name.includes('energy') && r.unitName === 'KCAL')) n.calories  = v;
    else if (id === NID.protein  || name === 'protein')                             n.protein   = v;
    else if (id === NID.carbs    || (name.includes('carbohydrate') && name.includes('difference'))) n.carbs = v;
    else if (id === NID.fat      || name === 'total lipid (fat)')                  n.fat       = v;
    else if (id === NID.water    || name === 'water')                              n.water     = v;
    else if (id === NID.potassium|| name.includes('potassium'))                    n.potassium = v;
  }
  return n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFood(f: Record<string, any>): FoodItem {
  const nutrients = extractNutrients((f.foodNutrients ?? []) as RawNutrient[]);
  return {
    fdcId:       f.fdcId as number,
    description: (f.description as string) ?? '',
    brandOwner:  f.brandOwner as string | undefined,
    foodCategory:f.foodCategory as string | undefined,
    fdcDataType: f.dataType as string | undefined,
    servingSize: (f.servingSize as number) || 100,
    servingUnit: (f.servingSizeUnit as string) || 'g',
    dataSource:  (f.dataType as string) ?? 'USDA FoodData Central',
    ...nutrients,
  };
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA API error ${res.status}`);
  return res.json();
}

function buildSearchUrl(query: string, pageSize = 25) {
  const p = new URLSearchParams({ api_key: API_KEY, query, pageSize: String(pageSize) });
  return `${BASE_URL}/foods/search?${p}`;
}

// Find best single food match for a query string
async function executeSearch(query: string): Promise<FoodItem | null> {
  const key = `s:${query.toLowerCase()}`;
  const cached = getCache<FoodItem | null>(key);
  if (cached !== undefined) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await fetchJSON(buildSearchUrl(query))) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foods: Record<string, any>[] = data.foods ?? [];
    if (foods.length === 0) { setCache(key, null); return null; }

    // Priority: complete data → high-quality non-branded → any with potassium → first
    const priority = [
      (f: Record<string, any>) => { const m = mapFood(f); return m.potassium > 0 && m.carbs > 0 && m.calories > 0 ? m : null; },
      (f: Record<string, any>) => { if (!['Survey (FNDDS)','Foundation','SR Legacy'].includes(f.dataType ?? '')) return null; const m = mapFood(f); return m.potassium > 0 ? m : null; },
      (f: Record<string, any>) => { const m = mapFood(f); return m.potassium > 0 ? m : null; },
      (f: Record<string, any>) => mapFood(f),
    ];
    for (const pass of priority) {
      for (const food of foods) {
        const result = pass(food);
        if (result) { setCache(key, result); return result; }
      }
    }
    setCache(key, null);
    return null;
  } catch (e) {
    console.error('USDA search error:', e);
    return null;
  }
}

// Produce ordered search variants for a user query
function queryVariants(query: string): string[] {
  const variants = [query];
  const lc = query.toLowerCase();
  const words = lc.split(/\s+/);
  if (words.length > 1) variants.push(words[words.length - 1]);

  const map: [string[], string[]][] = [
    [['cracker','chip','crisp','pretzel'], ['crackers','rice cakes','pretzels']],
    [['bread'], ['white bread','bread']],
    [['cookie'], ['cookies','biscuits']],
    [['milk','cheese','yogurt','dairy'], ['milk','cheese','yogurt']],
    [['chicken','turkey','poultry'], ['chicken breast','turkey']],
    [['beef','steak','hamburger'], ['lean beef','ground beef']],
    [['fish','salmon','tuna'], ['fish','tuna canned']],
    [['bean','lentil'], ['green beans','beans canned']],
    [['pasta','noodle'], ['pasta','spaghetti']],
    [['rice'], ['white rice','brown rice']],
  ];
  for (const [triggers, extras] of map) {
    if (triggers.some(t => lc.includes(t))) variants.push(...extras);
  }
  return [...new Set(variants)];
}

export async function searchFood(query: string): Promise<FoodItem | null> {
  for (const variant of queryVariants(query)) {
    const result = await executeSearch(variant);
    if (result) return result;
  }
  return null;
}

// Find candidate alternatives with potassium < target
export async function searchCandidates(
  term: string,
  targetPotassium: number,
  seen: Set<string>,
  pageSize = 50,
): Promise<FoodItem[]> {
  const key = `c:${term}`;
  let foods = getCache<FoodItem[]>(key);

  if (foods === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await fetchJSON(buildSearchUrl(term, pageSize))) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      foods = ((data.foods ?? []) as Record<string, any>[]).map(mapFood);
      setCache(key, foods);
    } catch {
      return [];
    }
  }

  return (foods ?? []).filter(
    f => f.potassium > 0 && f.potassium < targetPotassium && !seen.has(f.description),
  );
}
