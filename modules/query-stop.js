import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { pyodideContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';
import { store } from './store.js';
export class QueryStop extends LitElement {

  static styles = [picocss, css`
    #md-query-stop-btn {
      float: left;
      margin-left: 0.5rem;
      margin-bottom: 0px;
      min-width: 3rem;
    }
  `];

  static properties = {
    disabled: {type: Boolean},
    cancelCallBack: {type: Function}
  };

  constructor() {
    super();
    this.disabled = true
    this.text = 'Stop'
  }

  async queryStop(){
    this.cancelCallBack()
    try{

      await this.pyodide.runPythonAsync(`
        try:
          await llm.task.cancel()
          callback(" CANCELLED")
          cancelcallback("Task was cancelled.")
        except Exception as e:
            print("Caught a generic exception:", e)
      `)
      store.setStopped(true)
    }catch(e){
      console.error('Error awaiting python cancel:', e)
    }
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
