/**
 * Muestra un mensaje genérico y seguro al usuario en la región de alerta global.
 * Nunca expone detalles técnicos, stack traces ni rutas (CLAUDE.md).
 */
export function showUserMessage(message = 'Ocurrió un error al procesar la solicitud.') {
  const alertContainer = document.querySelector('[data-alert]');
  if (!alertContainer) return;

  alertContainer.textContent = message;
  alertContainer.hidden = false;
}
