import { useState } from 'react';
import type { SearchResults, FoodResult } from './types/food';
import { searchFood } from './services/usda';
import { findAlternatives } from './services/matcher';
import { calculateBioavailability } from './services/bioavailability';
import { runOcr, parseLabelText, labelToFoodItem } from './services/ocr';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import FoodCard from './components/FoodCard';
import ServingSizeControl from './components/ServingSizeControl';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBanner from './components/ErrorBanner';

export default function App() {
  const [results, setResults]       = useState<SearchResults | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [ocrProgress, setOcrProgress] = useState<number | undefined>();
  const [ocrStatus, setOcrStatus]     = useState<string | undefined>();
  const [servingGrams, setServingGrams] = useState(100);

  function reset() { setError(null); setResults(null); }

  async function handleSearch(query: string) {
    reset();
    setIsLoading(true);
    setLoadingMsg('Looking up nutrition data…');
    try {
      const food = await searchFood(query);
      if (!food) throw new Error(`"${query}" was not found. Try a more specific name or a common name instead of a brand.`);

      setLoadingMsg('Finding lower-potassium alternatives…');
      const bio   = calculateBioavailability(food);
      const alts  = await findAlternatives(food, 5);
      const target: FoodResult = { food, bioavailability: bio };

      setServingGrams(food.servingSize || 100);
      setResults({ target, alternatives: alts });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMsg('');
    }
  }

  async function handleImageFile(file: File, query: string) {
    reset();
    setIsLoading(true);
    setOcrProgress(0);
    setOcrStatus('Initialising OCR…');
    setLoadingMsg('Reading nutrition label…');

    try {
      const text = await runOcr(file, ({ status, progress }) => {
        setOcrStatus(status);
        setOcrProgress(progress);
      });

      setOcrProgress(undefined);
      setOcrStatus(undefined);
      setLoadingMsg('Parsing nutrition data…');

      const label = parseLabelText(text);
      const food  = labelToFoodItem(label, query || file.name.replace(/\.[^.]+$/, ''));

      if (!food || food.potassium === 0) {
        throw new Error('Could not read potassium from the label. Please ensure the label is clear and well-lit, then try again.');
      }

      setLoadingMsg('Finding lower-potassium alternatives…');
      const bio  = calculateBioavailability(food);
      const alts = await findAlternatives(food, 5);

      setServingGrams(food.servingSize || 100);
      setResults({ target: { food, bioavailability: bio }, alternatives: alts });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMsg('');
      setOcrProgress(undefined);
      setOcrStatus(undefined);
    }
  }

  const hasAlts = results && results.alternatives.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <SearchPanel
          onSearch={handleSearch}
          onImageFile={handleImageFile}
          isLoading={isLoading}
          ocrProgress={ocrProgress}
          ocrStatus={ocrStatus}
        />

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        {isLoading && <LoadingSpinner message={loadingMsg} />}

        {results && !isLoading && (
          <>
            {/* Serving size control */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3">
              <ServingSizeControl
                value={servingGrams}
                onChange={setServingGrams}
                defaultServing={results.target.food.servingSize || 100}
              />
            </div>

            {/* Target food */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
                Your food
              </h2>
              <FoodCard result={results.target} servingGrams={servingGrams} variant="target" />
            </section>

            {/* Alternatives */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
                {hasAlts
                  ? `${results.alternatives.length} Lower-Potassium Alternative${results.alternatives.length > 1 ? 's' : ''}`
                  : 'No alternatives found'}
              </h2>

              {hasAlts ? (
                <div className="space-y-3">
                  {results.alternatives.map(alt => (
                    <FoodCard
                      key={String(alt.food.fdcId)}
                      result={alt}
                      servingGrams={servingGrams}
                      variant="alternative"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">
                  No alternatives with lower potassium were found in the USDA database for this food.
                  Try searching for a more specific food or a different category.
                </p>
              )}
            </section>

            {/* Data citation + disclaimer */}
            <footer className="text-xs text-gray-400 space-y-2 border-t border-gray-200 pt-4">
              <p>
                <strong>Data source:</strong> USDA FoodData Central (api.nal.usda.gov).
                Bioavailability estimates are based on published nutritional science literature and food category research.
              </p>
              <p className="italic">
                This tool is for educational purposes only and is not a substitute for professional
                medical or dietary advice. Consult your nephrologist or registered dietitian before
                making dietary changes, especially if you have chronic kidney disease (CKD) or
                another condition requiring potassium restriction.
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
