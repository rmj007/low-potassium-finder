import type { FoodItem } from '../types/food';

export interface OcrProgress {
  status: string;
  progress: number; // 0–100
}

// Run Tesseract.js OCR on an image file and return extracted text.
export async function runOcr(
  file: File,
  onProgress: (p: OcrProgress) => void,
): Promise<string> {
  // Dynamic import to avoid bundling Tesseract until needed
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      onProgress({ status: m.status, progress: Math.round((m.progress ?? 0) * 100) });
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

// Parse a Nutrition Facts label text into a partial FoodItem (per-serving values).
// Returns values as-found from the label — the caller must normalize to 100g.
export interface LabelData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  water?: number;
  potassium?: number;
  servingSize?: number;
  servingUnit?: string;
}

export function parseLabelText(text: string): LabelData {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const result: LabelData = {};

  const num = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''));

  // Search against individual lines first, then the full joined text as fallback.
  // This handles Tesseract splitting a row across lines or omitting spaces on
  // two-column labels (e.g. "Potassium90mg" with no gap).
  const fullText = lines.join(' ');
  const targets = [...lines, fullText];

  // Serving size — check each line
  for (const line of lines) {
    if (!result.servingSize && /serving size/i.test(line)) {
      // Prefer weight in parentheses: "16 pieces (31g)"
      const mParen = line.match(/\((\d+(?:\.\d+)?)\s*(g|ml)\)/i);
      const mPlain = line.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz|cup|tbsp|tsp)/i);
      const m = mParen ?? mPlain;
      if (m) { result.servingSize = parseFloat(m[1]); result.servingUnit = m[2].toLowerCase(); }
    }
  }

  // Nutrient patterns — [:\s]* between name and value handles:
  //   "Potassium 90mg", "Potassium90mg", "Potassium: 90 mg", "Potassium  90"
  const patterns: [RegExp, keyof LabelData][] = [
    [/calories?[:\s]*(\d+)/i,                       'calories'],
    [/total\s+fat[:\s]*([\d.]+)\s*g/i,              'fat'],
    [/total\s+carb\w*[:\s]*([\d.]+)\s*g/i,          'carbs'],
    [/protein[:\s]*([\d.]+)\s*g/i,                  'protein'],
    [/potassium[:\s]*(\d+)\s*m?g/i,                 'potassium'],
  ];

  for (const [re, field] of patterns) {
    if (result[field] !== undefined) continue;
    for (const target of targets) {
      const m = target.match(re);
      if (m) { result[field] = num(m[1]) as never; break; }
    }
  }

  return result;
}

// Convert per-serving label values to per-100g FoodItem (as partial).
export function labelToFoodItem(label: LabelData, query: string): FoodItem | null {
  const { servingSize = 100, servingUnit = 'g' } = label;

  // Determine gram equivalent of serving
  let servingGrams = servingSize;
  if (servingUnit === 'oz') servingGrams = servingSize * 28.35;
  else if (servingUnit === 'ml') servingGrams = servingSize; // approximate density 1
  // cups/tbsp etc. are left as-is with a rough default; real accuracy needs density
  else if (!['g', 'gram', 'grams', 'ml'].includes(servingUnit)) servingGrams = 100;

  const scale = 100 / servingGrams;

  return {
    fdcId: 'label',
    description: query || 'Scanned label',
    servingSize: servingGrams,
    servingUnit: 'g',
    dataSource: 'Nutrition Facts Label (OCR)',
    calories:  Math.round((label.calories  ?? 0) * scale),
    protein:   Math.round(((label.protein  ?? 0) * scale) * 10) / 10,
    carbs:     Math.round(((label.carbs    ?? 0) * scale) * 10) / 10,
    fat:       Math.round(((label.fat      ?? 0) * scale) * 10) / 10,
    water:     null,
    potassium: Math.round((label.potassium ?? 0) * scale),
  };
}
