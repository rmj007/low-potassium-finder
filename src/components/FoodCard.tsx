import type { FoodResult } from '../types/food';
import NutrientTable from './NutrientTable';
import BioavailabilityBadge from './BioavailabilityBadge';

interface Props {
  result: FoodResult;
  servingGrams: number;
  variant?: 'target' | 'alternative';
}

const dataSourceColors: Record<string, string> = {
  'Foundation':        'bg-blue-100 text-blue-800',
  'SR Legacy':         'bg-blue-100 text-blue-800',
  'Survey (FNDDS)':    'bg-blue-100 text-blue-800',
  'Branded':           'bg-purple-100 text-purple-800',
};

function sourceChip(source: string) {
  const cls = dataSourceColors[source] ?? 'bg-gray-100 text-gray-700';
  const label = source === 'Branded' ? 'USDA Branded'
    : source === 'Nutrition Facts Label (OCR)' ? 'Label (OCR)'
    : `USDA ${source}`;
  return <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${cls}`}>{label}</span>;
}

export default function FoodCard({ result, servingGrams, variant = 'target' }: Props) {
  const { food, bioavailability, potassiumReductionMg, potassiumReductionPct } = result;
  const isAlternative = variant === 'alternative';

  return (
    <div className={`rounded-lg border bg-white shadow-sm p-4 ${isAlternative ? 'border-gray-200' : 'border-blue-200 ring-1 ring-blue-100'}`}>
      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 leading-snug text-base">
            {food.description}
          </h3>
          {food.brandOwner && (
            <p className="text-xs text-gray-500 mt-0.5">{food.brandOwner}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 items-center shrink-0">
          {sourceChip(food.dataSource)}

          {/* Potassium reduction badge (alternatives only) */}
          {isAlternative && potassiumReductionMg !== undefined && potassiumReductionPct !== undefined && (
            <span className="text-xs font-semibold bg-green-100 text-green-800 rounded-full px-2 py-0.5">
              -{potassiumReductionMg} mg (-{potassiumReductionPct}%) K
            </span>
          )}
        </div>
      </div>

      {/* Bioavailability */}
      <div className="mb-3">
        <BioavailabilityBadge bio={bioavailability} />
      </div>

      {/* Nutrient table */}
      <NutrientTable food={food} servingGrams={servingGrams} />
    </div>
  );
}
