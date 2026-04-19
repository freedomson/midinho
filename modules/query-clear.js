import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import { picocss } from './style.js';
import { store } from './store.js';

export class QueryClear extends LitElement {

  static styles = [picocss, css`
    #md-query-clear-btn {
      margin-left:1px;
    }
  `];

  static properties = {
    disabled: { type: Boolean },
    clearCallBack: { type: Function },
  };

  constructor() {
    super();
    this.disabled = true;
  }

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this);   // ✅ react to language changes
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    super.disconnectedCallback();
  }

  execute() {
    this.setDisable(true);
    this.clearCallBack();
  }

  setDisable(value) {
    this.disabled = value;
  }

  render() {
    const label = store.t("common.clear");

    return html`
      <button
        id="md-query-clear-btn"
        @click=${this.disabled ? null : this.execute.bind(this)}
        ?disabled=${this.disabled}
        type="submit"
      >
        ${label}
      </button>
    `;
  }
}

customElements.define('md-query-clear', QueryClear);
