/**
 * Hidrata las imágenes de COLUMNA/secundarias del HTML con su versión optimizada
 * por vite-imagetools. Van below-the-fold y se revelan con scroll (data-animate),
 * así que la latencia de inyección por JS no molesta.
 *
 * ¿Por qué en JS y no en `<img src>`? vite-imagetools solo intercepta IMPORTS de
 * módulos, no los `src` directos del HTML. Si dejáramos el `src` apuntando al
 * original pesado, el navegador lo descargaría sin optimizar. Por eso el `<img>`
 * queda SIN `src` en el HTML (solo `data-img`) y aquí le asignamos la URL WebP
 * ya redimensionada. La fuente de verdad es este import (patrón de `data/obras-*`).
 *
 * ⚠ Los DOS fondos full-bleed críticos (fenomeno, contacto) NO van aquí: como el
 * Hero, usan un WebP estático pre-generado con `src` directo en el HTML → el
 * preload scanner los baja al parsear, sin esperar a este JS ni a la transformación
 * on-demand del dev server (que los hacía aparecer tras el texto / con flash de fondo).
 *
 * Directivas del query:
 *   - columnas/banda (artista, archivo)       → cap 1600px lado largo
 *   - exposicion.png (ya pequeña, 1213×1296)  → solo a WebP, sin resize (no ampliar)
 *   - logos (banda ancha)                     → cap 2000px lado largo
 * `fit=inside` conserva el ratio → los width/height del HTML (anti-CLS) siguen válidos.
 */
import artista from '../../assets/images/artista/artista-jarett-retrato.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';
import exposicion from '../../assets/images/exposicion/exposicion-museo-barroco.png?format=webp&quality=80';
import archivo from '../../assets/images/archivo/archivo-registro.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';
import logos from '../../assets/images/contacto/contacto-logos-institucionales.png?w=2000&h=2000&fit=inside&format=webp&quality=80';

const IMAGES = {
  artista,
  exposicion,
  archivo,
  'contacto-logos': logos,
};

/**
 * Asigna a cada `<img data-img="clave">` su URL optimizada. Idempotente y
 * tolerante: si falta un elemento, lo salta sin romper el resto.
 */
export function initStaticImages() {
  try {
    for (const [key, url] of Object.entries(IMAGES)) {
      const img = document.querySelector(`img[data-img="${key}"]`);
      if (img) img.src = url;
    }
  } catch (error) {
    console.error(
      `${new Date().toISOString()} - staticImages.js@initStaticImages - ${error.message}`,
    );
  }
}
