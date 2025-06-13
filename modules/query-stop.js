import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { pyodideContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
export class QueryStop extends LitElement {

  static styles = css`
    #md-query-stop-btn {
      float: left;
      margin-left: 0.5rem;
      margin-bottom: 0px;
      min-width: 3rem;
    }
  `;

  static properties = {
    disabled: {type: Boolean},
  };

  constructor() {
    super();
    this.disabled = true
    this.text = 'Stop'
  }

  queryStop(){
    this.pyodide.runPythonAsync(`
      try:
        llm.task.cancel()
      except Exception as e:
          print("Caught a generic exception:", e)
    `)
    this.setDisable(true)
  }

  setDisable(value){
    this.disabled = value
  }

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.sand.min.css">
      ${ this.disabled ?
        html `
          <div
            class="outline"
            id="md-query-stop-btn"
            @click=${this.queryStop.bind(this)}
            disabled
            type="submit">
            ${this.text}
          </div>
        `
        :
        html `
          <div
            class="outline"
            id="md-query-stop-btn"
            @click=${this.queryStop.bind(this)}
            type="submit">
            ${this.text}
          </div>
        `
      }
    `;
  }
}
consume({ context: pyodideContext })(QueryStop.prototype, 'pyodide');
customElements.define('md-query-stop', QueryStop);
