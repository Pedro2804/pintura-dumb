import { $ } from '../utils/dom.js';
import { logError } from '../utils/log.js';

const FILE = 'countdown.js';

/** Fecha de apertura de la exposición (coincide con el <time> del Hero). */
export const OPENING_DATE = '2026-11-13T18:33:00-06:00';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;

/**
 * Desglosa el tiempo restante hacia la fecha objetivo en
 * meses / días / horas / minutos / segundos usando calendario real
 * (los meses no tienen una duración fija en milisegundos).
 */
function getBreakdown(targetTime, nowTime) {
  const cursor = new Date(nowTime);
  let months = 0;

  // Avanza mes a mes mientras no se pase de la fecha objetivo.
  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);

    if (next.getTime() <= targetTime) {
      cursor.setTime(next.getTime());
      months += 1;
    } else {
      break;
    }
  }

  let remaining = targetTime - cursor.getTime();

  const days = Math.floor(remaining / DAY);
  remaining -= days * DAY;
  const hours = Math.floor(remaining / HOUR);
  remaining -= hours * HOUR;
  const minutes = Math.floor(remaining / MINUTE);
  remaining -= minutes * MINUTE;
  const seconds = Math.floor(remaining / 1000);

  return { months, days, hours, minutes, seconds };
}

const pad = (value) => String(value).padStart(2, '0');

/**
 * Inicializa la cuenta regresiva hacia la apertura.
 * No rompe la página si falta la fecha o algún nodo del DOM.
 */
export function initCountdown(targetDate = OPENING_DATE) {
  try {
    const root = $('[data-countdown]');
    if (!root) return;

    const targetTime = new Date(targetDate).getTime();
    if (Number.isNaN(targetTime)) {
      throw new Error(`Fecha de apertura inválida: ${targetDate}`);
    }

    const fields = {
      months: $('[data-countdown-months]', root),
      days: $('[data-countdown-days]', root),
      hours: $('[data-countdown-hours]', root),
      minutes: $('[data-countdown-minutes]', root),
      seconds: $('[data-countdown-seconds]', root),
    };

    // Sin los nodos mínimos no tiene sentido continuar.
    if (!fields.days || !fields.hours || !fields.minutes || !fields.seconds) return;

    const paint = (parts) => {
      Object.entries(parts).forEach(([key, value]) => {
        const node = fields[key];
        if (node) node.textContent = pad(value);
      });
    };

    let intervalId = null;

    const tick = () => {
      const diff = targetTime - Date.now();

      if (diff <= 0) {
        paint({ months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        root.dataset.countdownState = 'open';
        if (intervalId) clearInterval(intervalId);
        return;
      }

      paint(getBreakdown(targetTime, Date.now()));
    };

    tick(); // pinta de inmediato, sin esperar el primer segundo
    intervalId = setInterval(tick, 1000);
  } catch (error) {
    // El countdown es decorativo: se registra en dev, no se molesta al usuario.
    logError(FILE, 'initCountdown', error);
  }
}
