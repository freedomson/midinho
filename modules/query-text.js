import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import './query-start.js';
import './query-stop.js';
import './query-clear.js';
import './query-speak-selector.js';
import './memory-info.js';              // ✅ reusable memory component
import { picocss } from './style.js';

export class QueryText extends LitElement {

  static styles = [picocss, css`
    #md-query-text {
      min-height: 3rem;
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
    clearCallBack: { type: Function }
  };

  constructor() {
    super();
    this.disabled = false;
    this.errorMsg = false;
    this.placeholder = 'Ask anything';
  }

  firstUpdated() {
    this.textarea = this.renderRoot.getElementById('md-query-text');
    this.textarea.focus();
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
    this.start.setDisable(true);
    this.stop.setDisable(true);
    this.clear.setDisable(false);
    this.setDisabled(false);
  }

  disable() {
    this.textarea.value = "";
    this.start.setDisable(true);
    this.stop.setDisable(false);
  }

  disableClear() {
    this.clear.setDisable(true);
  }

  updateContent(content) {
    this.textarea.value = content;
  }

  /* ---------- Input handling ---------- */

  handleKeyup(e) {
    const process = (e.keyCode === 13 && !e.shiftKey);
    this.processQuery(process);
  }

  processQuery(process) {
    if (this.isEmptyAfterTrim(this.textarea.value)) {
      this.textarea.value = "";
      this.start.setDisable(true);
      return;
    }

    this.start.setDisable(false);

    if (process) {
      if (this.isLoading?.()) return;

      this.submitQuery(this.textarea.value);
      this.disable();
      this.setDisabled(true);
      this.textarea.value = "";
    }
  }

  /* ---------- Rendering ---------- */

  renderText() {
    if (this.errorMsg) {
      return html`
        <textarea
          class="outline"
          id="md-query-text"
          aria-invalid="true"
          placeholder="${this.placeholder}"
          aria-label="${this.placeholder}"
          @keyup=${this.handleKeyup}>
        </textarea>
        <small id="invalid-helper">${this.errorMsg}</small>
      `;
    }

    return html`
      <textarea
        class="outline"
        id="md-query-text"
        placeholder="${this.placeholder}"
        aria-label="${this.placeholder}"
        ?disabled=${this.disabled}
        @keyup=${this.handleKeyup}>
      </textarea>
    `;
  }

  render() {
    return html`
      ${this.renderText()}

      <fieldset role="group">
        <md-query-start
          .processQuery=${this.processQuery.bind(this)}>
        </md-query-start>

        <md-query-stop
          .cancelCallBack=${this.cancelCallBack.bind(this)}>
        </md-query-stop>

        <md-query-clear
          .clearCallBack=${this.clearCallBack.bind(this)}>
        </md-query-clear>

        <md-speak-selector></md-speak-selector>
      </fieldset>

      <div class="aiwarn">
        AI-generated content may be incorrect
      </div>

      <!-- ✅ Reusable memory component -->
      <md-memory-info />

      <br />
      <br />
    `;
  }
}

customElements.define('md-query-text', QueryText);
