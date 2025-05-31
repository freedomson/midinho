import { LitElement, html, css } from '/static/lit-core.min.js'

export class Header extends LitElement {

  static styles = css`
    #lettering {
      top: 1em
      display: fixed;
    }
    #header {
      text-align: center;
      display: block;
    }
    h1 {
      --pico-font-family: Pacifico, cursive;
      --pico-font-weight: 400;
      --pico-typography-spacing-vertical: 0.5rem;
    }
  `;

  render() {
    return html`
      <link rel="stylesheet" href="static/pico.min.css">
      <hgroup id="lettering">
        <h1 id="header">Private Ollama</h1>
      </hgroup>
    `;
  }
}
customElements.define('md-header', Header);
