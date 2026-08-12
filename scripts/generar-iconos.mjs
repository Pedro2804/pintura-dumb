/**
 * Genera el set de íconos del sitio a partir del PNG maestro que entrega el cliente.
 *
 *   Fuente : .ai/ICO.PNG   (cuadrado, RGBA, fondo transparente, símbolo plano)
 *   Salida : public/       (favicon.ico, favicon-96x96.png, apple-touch-icon.png,
 *                           icon-192.png, icon-512.png)
 *
 * Uso: `node scripts/generar-iconos.mjs`
 *
 * NO forma parte del build de Vite: se corre a mano cuando el cliente entrega un
 * ícono nuevo y los archivos resultantes se versionan dentro de public/. Depende
 * de `sharp`, que ya viene con vite-imagetools.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const SRC = fileURLToPath(new URL('../.ai/ICO.PNG', import.meta.url));
const OUT = fileURLToPath(new URL('../public/', import.meta.url));

/** --color-ink: el mismo valor que declara <meta name="theme-color">. */
const TINTA = '#000033';
const TRANSPARENTE = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Recorta el lienzo al contenido visible. El maestro puede traer aire irregular
 * alrededor del símbolo; al eliminarlo controlamos el margen en cada tamaño.
 *
 * @param {string} rutaOrigen
 * @returns {Promise<Buffer>} PNG ajustado a los píxeles con alpha
 */
async function recortarAlContenido(rutaOrigen) {
  const { data, info } = await sharp(rutaOrigen)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    throw new Error('El PNG de origen no tiene píxeles visibles.');
  }

  return sharp(rutaOrigen)
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
}

/**
 * Centra el símbolo en un lienzo cuadrado con el margen y el fondo indicados.
 *
 * @param {Buffer} simbolo PNG ya recortado al contenido
 * @param {number} tamano  lado del lienzo, en píxeles
 * @param {number} margen  aire por lado, en proporción (0.06 = 6%)
 * @param {object|string} fondo color de fondo (RGBA u hex)
 * @returns {Promise<Buffer>}
 */
async function componer(simbolo, tamano, margen, fondo) {
  const interior = Math.round(tamano * (1 - margen * 2));

  const redimensionado = await sharp(simbolo)
    .resize(interior, interior, { fit: 'inside', background: TRANSPARENTE })
    .toBuffer();

  return sharp({
    create: { width: tamano, height: tamano, channels: 4, background: fondo },
  })
    .composite([{ input: redimensionado, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Empaqueta varios PNG en un contenedor .ICO. El formato admite PNG embebido
 * directo, soportado por todos los navegadores vigentes.
 *
 * @param {{ tamano: number, datos: Buffer }[]} imagenes
 * @returns {Buffer}
 */
function empaquetarIco(imagenes) {
  const BYTES_CABECERA = 6;
  const BYTES_ENTRADA = 16;

  const cabecera = Buffer.alloc(BYTES_CABECERA);
  cabecera.writeUInt16LE(0, 0); // reservado
  cabecera.writeUInt16LE(1, 2); // tipo: 1 = ícono
  cabecera.writeUInt16LE(imagenes.length, 4);

  let desplazamiento = BYTES_CABECERA + BYTES_ENTRADA * imagenes.length;
  const entradas = [];

  for (const { tamano, datos } of imagenes) {
    const entrada = Buffer.alloc(BYTES_ENTRADA);
    entrada.writeUInt8(tamano >= 256 ? 0 : tamano, 0); // ancho (0 significa 256)
    entrada.writeUInt8(tamano >= 256 ? 0 : tamano, 1); // alto
    entrada.writeUInt8(0, 2); // colores de paleta
    entrada.writeUInt8(0, 3); // reservado
    entrada.writeUInt16LE(1, 4); // planos de color
    entrada.writeUInt16LE(32, 6); // bits por píxel
    entrada.writeUInt32LE(datos.length, 8);
    entrada.writeUInt32LE(desplazamiento, 12);
    entradas.push(entrada);
    desplazamiento += datos.length;
  }

  return Buffer.concat([cabecera, ...entradas, ...imagenes.map(({ datos }) => datos)]);
}

async function main() {
  const simbolo = await recortarAlContenido(SRC);

  // favicon.ico — 16/32/48 con transparencia y margen mínimo para que respire.
  const png16a48 = await Promise.all(
    [16, 32, 48].map(async (tamano) => ({
      tamano,
      datos: await componer(simbolo, tamano, 0.04, TRANSPARENTE),
    }))
  );
  await writeFile(`${OUT}favicon.ico`, empaquetarIco(png16a48));

  // favicon-96x96.png — el que prefieren Chrome y Firefox en pestañas y favoritos.
  await writeFile(`${OUT}favicon-96x96.png`, await componer(simbolo, 96, 0.04, TRANSPARENTE));

  // apple-touch-icon.png — iOS descarta la transparencia: va con fondo sólido.
  await writeFile(`${OUT}apple-touch-icon.png`, await componer(simbolo, 180, 0.14, TINTA));

  // icon-192 / icon-512 — propósito "any": se muestran tal cual, margen normal.
  await writeFile(`${OUT}icon-192.png`, await componer(simbolo, 192, 0.1, TINTA));
  await writeFile(`${OUT}icon-512.png`, await componer(simbolo, 512, 0.1, TINTA));

  // Versión "maskable": Android recorta el ícono a la forma del launcher (círculo,
  // squircle, gota). Solo se garantiza visible el círculo central del 80%, así que
  // el símbolo se encoge para caber ahí y el fondo llena la esquina a esquina.
  // Deben declararse como entrada APARTE en el manifest: si se mezcla
  // `purpose: "any maskable"`, varios launchers lo tratan como "any", encogen el
  // ícono y le montan la plantilla blanca del sistema alrededor.
  await writeFile(`${OUT}icon-maskable-192.png`, await componer(simbolo, 192, 0.2, TINTA));
  await writeFile(`${OUT}icon-maskable-512.png`, await componer(simbolo, 512, 0.2, TINTA));

  console.log('Íconos generados en public/');
}

main();
