import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { picocss } from './style.js';
export class Loading extends LitElement {
  static styles = [picocss,css``];
  static properties = {
    loading: {type: Object}
  };
  render() {
    return html`
      <dialog open aria-busy="true">
      ${(typeof this.loading === "string")? this.loading : ""}
      </dialog>
    `;
  }
}
customElements.define('md-loading', Loading);
