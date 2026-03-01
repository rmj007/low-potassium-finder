import { useState } from 'react';
import type { BioavailabilityInfo } from '../types/food';

interface Props { bio: BioavailabilityInfo }

const tierStyles = {
  low:      'bg-green-50  text-green-800  border-green-200',
  moderate: 'bg-amber-50  text-amber-800  border-amber-200',
  high:     'bg-orange-50 text-orange-800 border-orange-200',
};

const tierDot = {
  low:      'bg-green-500',
  moderate: 'bg-amber-500',
  high:     'bg-orange-500',
};

export default function BioavailabilityBadge({ bio }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer select-none ${tierStyles[bio.tier]}`}
        aria-expanded={open}
      >
        <span className={`w-2 h-2 rounded-full ${tierDot[bio.tier]}`} />
        Dietary Impact {bio.score}/10
      </button>

      {open && (
        <div className="absolute z-10 left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700">
          <div className="font-semibold text-gray-900 mb-1">{bio.label}</div>
          <p className="mb-1">{bio.rationale}</p>
          {bio.tip && (
            <p className="mt-2 text-blue-700 bg-blue-50 rounded p-1.5">{bio.tip}</p>
          )}
          <p className="mt-2 text-gray-500">
            Estimated absorbed potassium: ~{bio.effectivePotassiumPer100g} mg / 100 g
          </p>
          <p className="mt-2 text-gray-400 italic">
            Score 1–10: lower = less absorbed (safer for CKD).
          </p>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 text-gray-400 hover:text-gray-600 text-xs underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
