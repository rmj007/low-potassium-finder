import type { FoodItem } from '../types/food';

interface Props {
  food: FoodItem;
  servingGrams: number;
}

function fmt(v: number, decimals = 1) {
  return decimals === 0 ? Math.round(v).toString() : v.toFixed(decimals);
}

function potassiumClass(mg: number) {
  if (mg < 150) return 'text-green-700 bg-green-50 font-semibold';
  if (mg < 300) return 'text-amber-700 bg-amber-50 font-semibold';
  return 'text-red-700 bg-red-50 font-semibold';
}

function potassiumLevel(mg: number) {
  if (mg < 150) return 'LOW';
  if (mg < 300) return 'MOD';
  return 'HIGH';
}

export default function NutrientTable({ food, servingGrams }: Props) {
  const scale = servingGrams / 100;

  const rows: { label: string; unit: string; per100: number | null; decimals?: number }[] = [
    { label: 'Calories',    unit: 'kcal', per100: food.calories,  decimals: 0 },
    { label: 'Protein',     unit: 'g',    per100: food.protein              },
    { label: 'Carbohydrate',unit: 'g',    per100: food.carbs                },
    { label: 'Fat',         unit: 'g',    per100: food.fat                  },
    { label: 'Water',       unit: 'g',    per100: food.water                },
    { label: 'Potassium',   unit: 'mg',   per100: food.potassium, decimals: 0 },
  ];

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
          <th className="pb-1 pr-3 font-medium">Nutrient</th>
          <th className="pb-1 pr-3 font-medium text-right">Per {servingGrams} g</th>
          <th className="pb-1 font-medium text-right">Per 100 g</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, unit, per100, decimals = 1 }) => {
          const isK = label === 'Potassium';
          const missing = per100 === null;
          const v100 = per100 ?? 0;
          const vServing = v100 * scale;

          return (
            <tr key={label} className="border-t border-gray-100">
              <td className="py-1.5 pr-3 text-gray-700 font-medium">{label}</td>
              <td className="py-1.5 pr-3 text-right text-gray-800">
                {missing ? 'N/A' : `${fmt(vServing, decimals)} ${unit}`}
              </td>
              <td className="py-1.5 text-right">
                {missing ? (
                  <span className="text-gray-400">N/A</span>
                ) : isK ? (
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${potassiumClass(v100)}`}>
                    {fmt(v100, decimals)} {unit}
                    <span className="text-[10px] opacity-70">{potassiumLevel(v100)}</span>
                  </span>
                ) : (
                  <span className="text-gray-800">{fmt(v100, decimals)} {unit}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
