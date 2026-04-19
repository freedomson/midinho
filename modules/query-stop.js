import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import { picocss } from './style.js';
import { store } from './store.js';

export class QueryStop extends LitElement {

  static styles = [picocss, css`
    #md-query-stop-btn {
      margin-left:1px;
    }
  `];

  static properties = {
    disabled: { type: Boolean },
    cancelCallBack: { type: Function }
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

  async queryStop() {
    this.cancelCallBack();

    try {
      store.setStopped(true);
    } catch (e) {
      console.error('Error awaiting python cancel:', e);
    }

    this.setDisable(true);
  }

  setDisable(value) {
    this.disabled = value;
  }

  render() {
    const label = store.t("common.stop");

    return html`
      <button
        id="md-query-stop-btn"
        @click=${this.disabled ? null : this.queryStop.bind(this)}
        ?disabled=${this.disabled}
        type="submit"
      >
        ${label}
      </button>
    `;
  }
}

customElements.define('md-query-stop', QueryStop);
