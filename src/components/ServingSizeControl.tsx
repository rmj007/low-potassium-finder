interface Props {
  value: number;
  onChange: (grams: number) => void;
  defaultServing: number;
}

export default function ServingSizeControl({ value, onChange, defaultServing }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600 font-medium">Serving size:</span>
      <button
        onClick={() => onChange(Math.max(1, value - 10))}
        className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold"
        aria-label="Decrease serving"
      >
        −
      </button>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="1"
          max="2000"
          value={value}
          onChange={e => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v > 0) onChange(v);
          }}
          className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Serving size in grams"
        />
        <span className="text-gray-600">g</span>
      </div>
      <button
        onClick={() => onChange(value + 10)}
        className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center font-bold"
        aria-label="Increase serving"
      >
        +
      </button>
      {value !== defaultServing && (
        <button
          onClick={() => onChange(defaultServing)}
          className="text-xs text-blue-600 hover:underline"
        >
          Reset to USDA default ({defaultServing} g)
        </button>
      )}
    </div>
  );
}
