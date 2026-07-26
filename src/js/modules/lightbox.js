import { logError } from '../utils/log.js';

const FILE = 'lightbox.js';

// Un solo <dialog> COMPARTIDO por todas las instancias (Dump hoy; Trayectoria u
// otras podrán reusarlo). Se crea perezosamente la primera vez que se usa.
let dialog = null;
let dialogImg = null;
// onClose de la instancia que abrió actualmente (el <dialog> es compartido, así
// que el evento `close` — ESC / fondo / ✕ — debe llamar al callback correcto).
let activeOnClose = null;

function ensureDialog() {
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Vista ampliada de la imagen');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lightbox__close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';

  dialogImg = document.createElement('img');
  dialogImg.className = 'lightbox__image';
  dialogImg.alt = '';
  dialogImg.decoding = 'async';

  dialog.append(closeBtn, dialogImg);
  document.body.append(dialog);

  // Botón ✕ y clic en el FONDO (fuera de la imagen/botón) cierran.
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  // `close` cubre ESC (nativo), el botón y el fondo → callback + limpieza +
  // libera el bloqueo de scroll de la página.
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('has-lightbox-open');
    if (typeof activeOnClose === 'function') activeOnClose();
    activeOnClose = null;
    dialogImg.removeAttribute('src'); // libera la imagen ampliada
  });

  return dialog;
}

/**
 * Lightbox reutilizable: al activar `trigger` (clic o Enter/Espacio), abre un
 * <dialog> modal con la imagen ampliada (centrada, sin recorte). Cierra con ESC
 * (nativo), clic en el fondo o el botón ✕. Progressive enhancement: si algo falla,
 * la página sigue funcionando (la imagen se ve en su tamaño normal).
 *
 * @param {Object}   config
 * @param {Element}  config.trigger     Elemento que abre el lightbox al activarse.
 * @param {Function} config.getSource   () => ({ src, alt }) de la imagen a ampliar.
 * @param {Function} [config.onOpen]    Callback al abrir (p. ej. pausar autoplay).
 * @param {Function} [config.onClose]   Callback al cerrar (p. ej. reanudar autoplay).
 */
export function initLightbox({ trigger, getSource, onOpen, onClose } = {}) {
  try {
    if (!trigger || typeof getSource !== 'function') return;
    ensureDialog();

    const open = () => {
      const { src, alt } = getSource() || {};
      if (!src || typeof dialog.showModal !== 'function') return;
      dialogImg.src = src;
      dialogImg.alt = alt || '';
      activeOnClose = typeof onClose === 'function' ? onClose : null;
      dialog.showModal();
      // Bloquea el scroll de la página → se queda en la sección mientras se ve
      // la imagen. Se libera en el evento `close`.
      document.documentElement.classList.add('has-lightbox-open');
      if (typeof onOpen === 'function') onOpen();
    };

    // Accesible por teclado: el trigger (una imagen) se hace enfocable y responde
    // a Enter/Espacio, además del clic del ratón/táctil.
    if (!trigger.hasAttribute('tabindex')) trigger.tabIndex = 0;
    trigger.setAttribute('role', 'button');

    trigger.addEventListener('click', open);
    trigger.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      open();
    });

    // Se devuelve `open` para poder abrir el lightbox desde OTRO disparador
    // (ej. Trayectoria: la miniatura central del carrusel, no solo la obra grande).
    return { open };
  } catch (error) {
    logError(FILE, 'initLightbox', error);
  }
}
