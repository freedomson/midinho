import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { pyodideContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';
export class QueryClear extends LitElement {

  static styles = [picocss, css`
    #md-query-clear-btn {
      float: left;
      margin-left: 0.5rem;
      margin-bottom: 0px;
      min-width: 3rem;
    }
  `];

  static properties = {
    disabled: {type: Boolean}
  };

  constructor() {
    super();
    this.disabled = true
    this.text = 'Clear'
  }

  execute(){
    this.pyodide.runPythonAsync(`
      try:
        llm.chat_history = []
      except Exception as e:
          print(dir(llm))
          print("Caught a generic exception:", e)
    `)
    this.clearCallBack()
    this.setDisable(true)
  }

  setDisable(value){
    this.disabled = value
  }

  render() {
    return html`
      ${ this.disabled ?
        html `
          <div
            class="outline"
            id="md-query-clear-btn"
            @click=${this.execute.bind(this)}
            disabled
            type="submit">
            ${this.text}
          </div>
        `
        :
        html `
          <div
            class="outline"
            id="md-query-clear-btn"
            @click=${this.execute.bind(this)}
            type="submit">
            ${this.text}
          </div>
        `
      }
    `;
  }
}
consume({ context: pyodideContext })(QueryClear.prototype, 'pyodide');
customElements.define('md-query-clear', QueryClear);
