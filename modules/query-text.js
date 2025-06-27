import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './query-start.js';
import './query-stop.js';
import './query-speak-selector.js';
import { pyodideContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';
export class QueryText extends LitElement {

  static styles = [picocss, css`
      #md-query-text{
        min-height: 3rem;
      }
    `];

  static properties = {
    disabled: {type: Boolean},
    submitQuery: { type: Function},
    cancelCallBack: { type: Function}
  };

  constructor() {
    super();
    this.disabled = false
    this.errorMsg = false
    this.placeholder = 'Ask anything';
  }

  firstUpdated() {
    this.textarea = this.renderRoot.getElementById('md-query-text');
    this.textarea.focus();
  }

  updated(){
    this.textarea = this.renderRoot.getElementById('md-query-text');
    this.start = this.shadowRoot.querySelector('md-query-start');
    this.stop = this.shadowRoot.querySelector('md-query-stop');
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
      this.textarea.value = ""
      this.setErrorMsg("")
    }
  }

  enable(){
    this.start.setDisable(true)
    this.stop.setDisable(true)
  }

  setErrorMsg(e){
    this.errorMsg = e;
    this.requestUpdate();
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

  render() {
    return html`
        ${ this.renderText() }
        <fieldset role="group">
          <md-query-start
            .processQuery=${this.processQuery.bind(this)}></md-query-start>
          <md-query-stop
            .cancelCallBack=${this.cancelCallBack.bind(this)}
            .pyodide=${this.pyodide}></md-query-stop>
          <md-speak-selector></md-speak-selector>
        </fieldset>
        <br/>
        <br/>
    `;
  }
}
consume({ context: pyodideContext })(QueryText.prototype, 'pyodide');
customElements.define('md-query-text', QueryText);
