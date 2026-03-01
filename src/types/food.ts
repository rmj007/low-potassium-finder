// All nutrient values stored per 100 g. The UI layer scales to serving size.

export interface FoodItem {
  fdcId: number | string;
  description: string;
  brandOwner?: string;
  foodCategory?: string;
  fdcDataType?: string;
  // Nutrients per 100 g
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number | null;   // null = not reported
  potassium: number;
  // USDA serving reference (for default display)
  servingSize: number;    // grams
  servingUnit: string;
  dataSource: string;
}

export interface BioavailabilityInfo {
  score: number;                    // 1–10 Dietary Impact Score
  tier: 'low' | 'moderate' | 'high';
  label: string;                    // e.g. "High Impact (9/10)"
  rationale: string;                // clinical explanation
  tip?: string;                     // practical preparation tip
  bioavailabilityFraction: number;  // 0–1 fraction of listed K absorbed
  effectivePotassiumPer100g: number;// estimated absorbed mg/100 g
}

export interface FoodResult {
  food: FoodItem;
  bioavailability: BioavailabilityInfo;
  // Populated only for alternatives:
  potassiumReductionMg?: number;
  potassiumReductionPct?: number;
}

export interface SearchResults {
  target: FoodResult;
  alternatives: FoodResult[];
}
