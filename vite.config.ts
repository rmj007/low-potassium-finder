import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set VITE_BASE_PATH env var (e.g. /low-potassium-finder/) for GitHub Pages.
// Local dev uses '/' automatically when the var is unset.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? (process.env.VITE_BASE_PATH ?? '/low-potassium-finder/') : '/',
}));
