import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import './query-start.js';
import './query-stop.js';
import './query-clear.js';
import './query-speak-selector.js';
import './memory-info.js';
import { picocss } from './style.js';
import { store } from './store.js';

export class QueryText extends LitElement {

  static styles = [picocss, css`
    #md-query-text {
      min-height: 8rem;
    }
    .aiwarn {
      text-align: center;
      font-size: 1rem;
    }
  `];

  static properties = {
    disabled: { type: Boolean },
    submitQuery: { type: Function },
    cancelCallBack: { type: Function },
    clearCallBack: { type: Function },
    isLoading: { type: Function }, // ✅ ensure this exists as a property
    errorMsg: { type: String }
  };

  constructor() {
    super();
    this.disabled = false;
    this.errorMsg = "";
  }

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this); // ✅ rerender when language changes
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    super.disconnectedCallback();
  }

  firstUpdated() {
    this.textarea = this.renderRoot.getElementById('md-query-text');
    this.textarea?.focus();
  }

  updated() {
    this.textarea = this.renderRoot.getElementById('md-query-text');
    this.start = this.shadowRoot.querySelector('md-query-start');
    this.stop = this.shadowRoot.querySelector('md-query-stop');
    this.clear = this.shadowRoot.querySelector('md-query-clear');
  }

  /* ---------- UI helpers ---------- */

  isEmptyAfterTrim(str) {
    return str.replace(/\s/g, '') === '';
  }

  setDisabled(status) {
    this.disabled = status;
  }

  enable() {
    this.start?.setDisable(true);
    this.stop?.setDisable(true);
    this.clear?.setDisable(false);
    this.setDisabled(false);
  }

  disable() {
    if (this.textarea) this.textarea.value = "";
    this.start?.setDisable(true);
    this.stop?.setDisable(false);
  }

  disableClear() {
    this.clear?.setDisable(true);
  }

  updateContent(content) {
    if (this.textarea) this.textarea.value = content;
  }

  setErrorMsg(msg) {
    this.errorMsg = msg || "";
  }

  /* ---------- Input handling ---------- */

  handleKeyup(e) {
    const process = (e.key === "Enter" && !e.shiftKey);
    this.processQuery(process);
  }

  processQuery(process) {
    if (!this.textarea) return;

    if (this.isEmptyAfterTrim(this.textarea.value)) {
      this.textarea.value = "";
      this.start?.setDisable(true);
      return;
    }

    this.start?.setDisable(false);

    if (process) {
      if (this.isLoading?.()) return;

      this.submitQuery?.(this.textarea.value);

      // ✅ clear should be disabled while response is processed
      this.clear?.setDisable(true);

      this.disable();
      this.setDisabled(true);
      this.textarea.value = "";
    }
  }

  onResponseStopped() {
    this.clear?.setDisable(false);
    this.setDisabled(false);
  }

  /* ---------- Rendering ---------- */

  renderText() {
    const placeholder = store.t("queryText.placeholder");

    if (this.errorMsg) {
      return html`
        <textarea
          id="md-query-text"
          aria-invalid="true"
          placeholder="${placeholder}"
          aria-label="${placeholder}"
          @keyup=${(e) => this.handleKeyup(e)}>
        </textarea>
        <small id="invalid-helper">${this.errorMsg}</small>
      `;
    }

    return html`
      <textarea
        id="md-query-text"
        placeholder="${placeholder}"
        aria-label="${placeholder}"
        ?disabled=${this.disabled}
        @keyup=${(e) => this.handleKeyup(e)}></textarea>
    `;

  }

  render() {
    return html`
      ${this.renderText()}

      <fieldset role="group">
        <md-query-start
          .processQuery=${(p) => this.processQuery(p)}>
        </md-query-start>

        <md-query-stop
          .cancelCallBack=${(err) => {
            this.cancelCallBack?.(err);
            this.onResponseStopped();
          }}>
        </md-query-stop>

        <md-query-clear
          .clearCallBack=${() => this.clearCallBack?.()}>
        </md-query-clear>

        <md-speak-selector></md-speak-selector>
      </fieldset>

      <div class="aiwarn">
        ${store.t("queryText.aiWarning")}
      </div>

      <md-memory-info></md-memory-info>

      <br />
      <br />
    `;
  }
}

customElements.define('md-query-text', QueryText);
