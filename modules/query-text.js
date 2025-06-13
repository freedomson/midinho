import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './query-start.js';
import './query-stop.js';
import { pyodideContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';

export class QueryText extends LitElement {

  static styles = css`
    #md-query-text {
      max-height: 7rem;
      min-height: 5rem;
    }
  `;

  static properties = {
    disabled: {type: Boolean},
    submitQuery: { type: Function}
  };

  constructor() {
    super();
    this.disabled = false
    this.placeholder = 'Ask anything';
  }

  firstUpdated() {
    this.textarea = this.renderRoot.getElementById('md-query-text');
    this.textarea.focus();
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
    }
  }

  enable(){
    this.textarea.value = ""
    this.start.setDisable(true)
    this.stop.setDisable(true)
  }

  disable(){
    this.textarea.value = ""
    this.start.setDisable(true)
    this.stop.setDisable(false)
  }

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.sand.min.css">
        ${ this.disabled ?
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
        }
        <md-query-start
          .processQuery=${this.processQuery.bind(this)}
          ></md-query-start>
        <md-query-stop
          .pyodide=${this.pyodide}
          ></md-query-stop>
    `;
  }
}
consume({ context: pyodideContext })(QueryText.prototype, 'pyodide');
customElements.define('md-query-text', QueryText);
