import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import { picocss } from './style.js';
import { store } from './store.js';

export class QueryStart extends LitElement {
  static styles = [picocss, css`
    #md-query-start-btn {
    }
  `];

  static properties = {
    disabled: { type: Boolean },
  };

  constructor() {
    super();
    this.disabled = true;
  }

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this);
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    super.disconnectedCallback();
  }

  setDisable(value) {
    this.disabled = value;
  }

  process() {
    this.processQuery(true);
  }

  render() {
    const label = store.t("common.ask");

    return html`
      <button
        id="md-query-start-btn"
        @click=${this.disabled ? null : this.process}
        ?disabled=${this.disabled}
        type="submit"
      >
        ${label}
      </button>
    `;
  }
}

customElements.define('md-query-start', QueryStart);