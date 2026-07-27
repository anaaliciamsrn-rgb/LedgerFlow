import '@testing-library/jest-dom/vitest';

/**
 * O jsdom não implementa a Pointer Capture API. Componentes de arrastar
 * (`vaul`, usado no Drawer, e o Radix em geral) chamam esses métodos ao
 * receber um `pointerdown` e derrubam a suíte com "not a function" — mesmo
 * quando o comportamento sob teste nada tem a ver com arrastar.
 *
 * Os stubs abaixo não simulam captura de ponteiro; apenas impedem que a
 * ausência da API vire exceção.
 */
if (typeof Element !== 'undefined') {
  Element.prototype.setPointerCapture ??= function setPointerCapture(): void {};
  Element.prototype.releasePointerCapture ??=
    function releasePointerCapture(): void {};
  Element.prototype.hasPointerCapture ??=
    function hasPointerCapture(): boolean {
      return false;
    };
  Element.prototype.scrollIntoView ??= function scrollIntoView(): void {};
}
