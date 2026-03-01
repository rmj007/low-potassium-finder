import { useState, FormEvent } from 'react';
import ImageUpload from './ImageUpload';

type Tab = 'search' | 'upload';

interface Props {
  onSearch: (query: string) => void;
  onImageFile: (file: File, query: string) => void;
  isLoading: boolean;
  ocrProgress?: number;
  ocrStatus?: string;
}

export default function SearchPanel({ onSearch, onImageFile, isLoading, ocrProgress, ocrStatus }: Props) {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [labelQuery, setLabelQuery] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  const tabBase  = 'px-4 py-2 text-sm font-medium border-b-2 transition-colors';
  const tabActive = `${tabBase} border-blue-700 text-blue-700`;
  const tabIdle   = `${tabBase} border-transparent text-gray-500 hover:text-gray-700`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        <button className={tab === 'search' ? tabActive : tabIdle} onClick={() => setTab('search')}>
          Search by Name
        </button>
        <button className={tab === 'upload' ? tabActive : tabIdle} onClick={() => setTab('upload')}>
          Upload Label Photo
        </button>
      </div>

      {tab === 'search' ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-gray-600">
            Enter a food name (e.g. "Greek yogurt") or a brand name (e.g. "Chobani plain").
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. banana, cheddar cheese, Gatorade"
              disabled={isLoading}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              aria-label="Food name"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Photograph or scan a Nutrition Facts label. The app reads it with OCR — no upload to any server.
          </p>
          <input
            type="text"
            value={labelQuery}
            onChange={e => setLabelQuery(e.target.value)}
            placeholder="Food name (for finding alternatives)"
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            aria-label="Food name for label"
          />
          <ImageUpload
            onFile={file => onImageFile(file, labelQuery)}
            disabled={isLoading}
            progress={ocrProgress}
            progressStatus={ocrStatus}
          />
        </div>
      )}
    </div>
  );
}
