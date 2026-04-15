import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './query-start.js';
import './query-stop.js';
import './query-clear.js';
import './query-speak-selector.js';
import { pyodideContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';

export class QueryText extends LitElement {

  static styles = [picocss, css`
      #md-query-text{
        min-height: 3rem;
      }
      .aiwarn {
        text-align: center
      }
      .meminfo {
        text-align: center;
        font-size: 0.9rem;
        opacity: 0.9;
      }
    `];

  static properties = {
    disabled: {type: Boolean},
    submitQuery: { type: Function},
    cancelCallBack: { type: Function},
    clearCallBack: { type: Function},

    // NEW: reactive state for memory display
    freeMemoryMb: { type: Number },
    memoryError: { type: String }
  };

  constructor() {
    super();
    this.disabled = false
    this.errorMsg = false
    this.placeholder = 'Ask anything';

    // NEW
    this.freeMemoryMb = null;
    this.memoryError = '';
    this._memTimer = null;
  }

  // NEW: start polling when element is connected
  connectedCallback() {
    super.connectedCallback();
    this._startMemoryPolling();
  }

  // NEW: stop polling when element is disconnected
  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopMemoryPolling();
  }

  _startMemoryPolling() {
    // initial fetch immediately
    this._fetchFreeMemory();

    // refresh every 30 seconds
    if (!this._memTimer) {
      this._memTimer = setInterval(() => this._fetchFreeMemory(), 1000);
    }
  }

  _stopMemoryPolling() {
    if (this._memTimer) {
      clearInterval(this._memTimer);
      this._memTimer = null;
    }
  }

  async _fetchFreeMemory() {
    try {
      const res = await fetch('http://localhost:8080/free-memory', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        this.memoryError = `memory endpoint error (${res.status})`;
        this.freeMemoryMb = null;
        return;
      }

      const data = await res.json();
      // Expecting { free_mb: <number> }
      const mb = Number(data.free_mb);

      if (Number.isFinite(mb)) {
        this.freeMemoryMb = mb;
        this.memoryError = '';
      } else {
        this.memoryError = 'invalid memory payload';
        this.freeMemoryMb = null;
      }
    } catch (e) {
      this.memoryError = 'memory fetch failed';
      this.freeMemoryMb = null;
    }
  }

  firstUpdated() {
    this.textarea = this.renderRoot.getElementById('md-query-text');
    this.textarea.focus();
  }

  updated(){
    this.textarea = this.renderRoot.getElementById('md-query-text');
    this.start = this.shadowRoot.querySelector('md-query-start');
    this.stop = this.shadowRoot.querySelector('md-query-stop');
    this.clear = this.shadowRoot.querySelector('md-query-clear');
  }

  disableClear(){
    this.clear.setDisable(true)
  }
  updateContent(content){
    this.textarea.value = content
  }

  isEmptyAfterTrim(str) {
    return str.replace(/\s/g, '') === '';
  }

  handleKeyup(e) {
    let process = ( e.keyCode == 13 && !e.shiftKey )
    this.processQuery(process)
  }

  processQuery(process){
    if (this.isEmptyAfterTrim(this.textarea.value)){
      this.textarea.value = ""
      this.start.setDisable(true)
      return;
    }
    this.start.setDisable(false)
    if ( process ) {
      if (this.isLoading()) {
        console.log("Loading content noop")
        return
      }
      this.submitQuery(this.textarea.value)
      this.disable()
      this.setDisabled(true)
      this.textarea.value = ""
    }
  }

  setDisabled(status) {
    this.disabled = status
  }

  enable(){
    this.start.setDisable(true)
    this.stop.setDisable(true)
    this.clear.setDisable(false)
    this.setDisabled(false) 
  }

  disable(){
    this.textarea.value = ""
    this.start.setDisable(true)
    this.stop.setDisable(false)
  }

  renderText() {
    if (this.errorMsg) {
      return html `
          <textarea
            class="outline"
            id="md-query-text"
            aria-invalid="true"
            placeholder="${this.placeholder}"
            aria-label="${this.placeholder}"
            @keyup=${this.handleKeyup}
          ></textarea>
        <small id="invalid-helper">${this.errorMsg}</small>
        `
    } else {
      let out = this.disabled ?
        html `
          <textarea
            class="outline"
            disabled
            id="md-query-text"
            placeholder="${this.placeholder}"
            aria-label="${this.placeholder}"
            @keyup=${this.handleKeyup}
          ></textarea>
        `
        :
        html `
          <textarea
            class="outline"
            id="md-query-text"
            placeholder="${this.placeholder}"
            aria-label="${this.placeholder}"
            @keyup=${this.handleKeyup}
          ></textarea>
        `
      return out;
    }
  }

  // NEW: small renderer for memory line
  renderMemory() {
    if (this.memoryError) {
      return html`<div class="meminfo">Free memory: <em>${this.memoryError}</em></div>`;
    }
    if (this.freeMemoryMb === null) {
      return html`<div class="meminfo">Free memory: <em>loading…</em></div>`;
    }
    return html`<div class="meminfo">Free memory: <strong>${this.freeMemoryMb}</strong> MB</div>`;
  }

  render() {
    return html`
        ${ this.renderText() }
        <fieldset role="group">
          <md-query-start
            .processQuery=${this.processQuery.bind(this)}></md-query-start>
          <md-query-stop
            .cancelCallBack=${this.cancelCallBack.bind(this)}
            .pyodide=${this.pyodide}></md-query-stop>
          <md-query-clear
            .clearCallBack=${this.clearCallBack.bind(this)}
            .pyodide=${this.pyodide}></md-query-clear>
          <md-speak-selector></md-speak-selector>
        </fieldset>

        <div class="aiwarn">AI-generated content may be incorrect</div>

        <!-- NEW: memory div after aiwarn -->
        ${this.renderMemory()}

        <br/>
        <br/>
    `;
  }
}

consume({ context: pyodideContext })(QueryText.prototype, 'pyodide');
customElements.define('md-query-text', QueryText);
