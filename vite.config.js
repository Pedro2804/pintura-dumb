import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  // vite-imagetools optimiza las imágenes importadas con directivas en el query
  // (`?w=1600&fit=inside&format=webp&quality=80`) en dev y build. Solo intercepta
  // IMPORTS de módulos, no los `src` directos del HTML → las imágenes de las
  // secciones se importan desde JS (`data/obras-*.js`, `modules/staticImages.js`).
  // Los originales pesados quedan como FUENTE (no se referencian sin optimizar).
  plugins: [imagetools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
