import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'

export class Header extends LitElement {

  static styles = css`

    #header {
      text-align: center;
      padding: 1rem;
    }
    #github-logo {
      margin:0;
      padding:0;
    }
    h1 {
      --pico-font-family: Pacifico, cursive;
      --pico-font-weight: 400;
      --pico-typography-spacing-vertical: 0.5rem;
    }
  `;

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.sand.min.css">
      <h1 id="header">Midinho</h1>
    `;
  }
}
customElements.define('md-header', Header);
