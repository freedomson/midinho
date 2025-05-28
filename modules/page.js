import {LitElement, html} from '/static/lit-core.min.js'
import './query.js';

export class Page extends LitElement {
  render() {
    return html`
      <link rel="stylesheet" href="static/pico.min.css">
      <md-query></md-query>
    `;
  }
}
customElements.define('md-page', Page);
