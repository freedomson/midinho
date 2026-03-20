import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { picocss } from './style.js';
export class Header extends LitElement {

  static styles = [picocss,css`
    .header {
      text-align: center;
      padding: 1rem;
    }
    h1 {
      --pico-font-family: Pacifico, cursive;
      --pico-font-weight: 400;
      --pico-typography-spacing-vertical: 0.5rem;
    }
  `];

  render() {
    return html`
      <h1 class="header">Doomai</h1>
    `;
  }
}
customElements.define('md-header', Header);
