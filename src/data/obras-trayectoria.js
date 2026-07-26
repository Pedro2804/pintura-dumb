/**
 * Obras de la sección «La trayectoria que antecede el fenómeno.» (#trayectoria).
 *
 * Sistema SEPARADO de Dump (obras distintas, estado independiente). Misma
 * fuente-de-verdad-en-JS y mismas reglas que `obras-dump.js`: imágenes
 * IMPORTADAS (Vite las procesa en build), técnica/año OPCIONALES (bloqueante
 * MASSIMO en algunas). Crecer el catálogo = un import + una entrada.
 */

// Igual que obras-dump: los .webp ya optimizados se importan tal cual; los .jpg
// pesados pasan por vite-imagetools (cap 1600px lado largo, WebP q80).
import inundacionII from '../assets/images/trayectoria/inundacion-informatica-ii-principal.webp';
import inundacionI from '../assets/images/trayectoria/inundacion-informatica-i-reproductibilidad.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';
import burbujaPinchadaII from '../assets/images/trayectoria/burbuja-pinchada-ii.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';
import perroDefecando from '../assets/images/trayectoria/estudio-de-perfil-de-un-perro-defecando.jpg?w=1600&h=1600&fit=inside&format=webp&quality=80';
import pescadoresI from '../assets/images/trayectoria/pescadores-de-hombres-01.webp';
import pescadoresII from '../assets/images/trayectoria/pescadores-de-hombres-02.webp';
import sanJeronimo from '../assets/images/trayectoria/san-jeronimo-principal.webp';

// Info entregada por MASSIMO (.ai/img_page/Info-obras/info-obras.md).
export const obrasTrayectoria = [
  {
    src: inundacionII,
    nombre: 'Inundación informática II',
    tecnica: 'óleo sobre lienzo',
    anio: 2022,
    width: 2000,
    height: 2578,
  },
  {
    src: inundacionI,
    nombre: 'Inundación informática I',
    // El md añade un subtítulo ("la reproducibilidad de la imagen") antes de la
    // técnica; se antepone en `tecnica` para mostrar la ficha completa.
    tecnica: 'la reproducibilidad de la imagen, óleo sobre lienzo',
    anio: 2022,
    width: 1849,
    height: 2605,
  },
  {
    src: burbujaPinchadaII,
    nombre: 'Burbuja pinchada II',
    tecnica: 'óleo sobre lienzo',
    anio: 2022,
    width: 4030,
    height: 5126,
  },
  {
    src: perroDefecando,
    nombre: 'Estudio de perfil de un perro defecando',
    tecnica: 'óleo sobre lienzo',
    anio: 2022,
    width: 6056,
    height: 4326,
  },
  {
    src: pescadoresI,
    nombre: 'Pescadores de hombres I',
    tecnica: 'óleo sobre tablero',
    anio: 2022,
    width: 2000,
    height: 1960,
  },
  {
    src: pescadoresII,
    nombre: 'Pescadores de hombres II',
    tecnica: 'óleo sobre tablero',
    anio: 2022,
    width: 1600,
    height: 1568,
  },
  {
    src: sanJeronimo,
    nombre: 'San Jerónimo penitente y los ángeles',
    tecnica: 'óleo sobre lienzo',
    anio: 2018,
    width: 2000,
    height: 3009,
  },
];
