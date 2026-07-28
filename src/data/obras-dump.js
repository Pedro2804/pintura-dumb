/**
 * Obras de la sección «Del vertedero a la trascendencia.» (#dump).
 *
 * FUENTE DE VERDAD de la galería. El JS (`obraCarousel.js`, el mismo motor que
 * Trayectoria) renderiza miniaturas y escenario a partir de este array — el HTML
 * solo aporta el cascarón. Crecer el catálogo = agregar un `import` + una entrada
 * aquí; la maquinaria no se toca (decisión 2026-06-16, ver memoria).
 *
 * Las rutas se IMPORTAN (no se hardcodean como string): así Vite las
 * procesa, hashea y optimiza en el build (skill /vite: "preferir imports").
 *
 * Campos por obra:
 *   src     {string}  URL resuelta por Vite (import).
 *   nombre  {string}  Título de la obra (se muestra en cursiva).
 *   tecnica {string=} Técnica — OPCIONAL (pendiente de MASSIMO en algunas).
 *   anio    {number=} Año — OPCIONAL (pendiente de MASSIMO en algunas).
 *   width   {number}  Ancho real del archivo (anti-CLS).
 *   height  {number}  Alto real del archivo (anti-CLS).
 */

// Los .webp destacados ya vienen optimizados de MASSIMO (~1300-1600px) → se
// importan tal cual. Los .jpg pesados (14-20 MP) pasan por vite-imagetools:
// `fit=inside` cap del lado largo a 1600px, WebP q80 (conserva el ratio → los
// width/height de abajo, y por tanto el anti-CLS, siguen siendo válidos).
import fuerteConviccion from '../assets/images/dump/fuerte-conviccion-principal.webp';
import weekendBaby from '../assets/images/dump/weekend-baby-principal.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';
import framesUsuarioI from '../assets/images/dump/frames-de-un-usuario-01.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';
import framesUsuarioII from '../assets/images/dump/frames-de-un-usuario-02.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';
import usuarioNattCalma from '../assets/images/dump/usuario-natt-calma.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';

// Info entregada por MASSIMO (.ai/img_page/Info-obras/info-obras.md). El catálogo
// CRECERÁ con más obras hasta la exposición: desde 2026-07-27 la sección usa el
// MISMO carrusel coverflow que Trayectoria (obraCarousel.js), así que crecer el
// catálogo es SOLO agregar un import + una entrada aquí — el layout ya no se toca.
export const obrasDump = [
  {
    src: fuerteConviccion,
    nombre: 'Fuerte convicción',
    tecnica: 'óleo sobre lienzo',
    anio: 2024,
    width: 1300,
    height: 1689,
  },
  {
    src: weekendBaby,
    nombre: 'Weekend baby',
    tecnica: 'óleo sobre lienzo',
    anio: 2025,
    width: 4501,
    height: 3133,
  },
  {
    src: framesUsuarioI,
    nombre: 'Frames de un usuario (parte I)',
    tecnica: 'óleo sobre lienzo',
    anio: 2025,
    width: 3428,
    height: 6002,
  },
  {
    src: framesUsuarioII,
    nombre: 'Frames de un usuario (parte II)',
    tecnica: 'óleo sobre lienzo',
    anio: 2025,
    width: 3213,
    height: 5632,
  },
  // Recuperada el 2026-07-27: se había quitado el 2026-07-26 porque la 5ª
  // miniatura descuadraba el grid 2×2 (ver cambios/2026-07-26_dump-lightbox-…).
  // Con el carrusel ese motivo desapareció → vuelve al catálogo.
  {
    src: usuarioNattCalma,
    nombre: 'Usuario Natt Calma',
    tecnica: 'óleo sobre lienzo',
    anio: 2026,
    width: 3746,
    height: 4994,
  },
];
