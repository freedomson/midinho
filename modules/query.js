import {LitElement, html} from '/static/lit-core.min.js'
import { consume } from 'https://esm.sh/@lit-labs/context';
import { pyodideContext } from './context.js';
import './search.js';

export class Query extends LitElement {

  static properties = {
    textarea: {type: Object},
    disabled: {type: Boolean}
  };

  constructor() {
    super();
    this.placeholder = 'Ask anything';
    this.buttonText = 'Ask';
    this.disabled = true
    this.msg = ""
  }

  handleKeyup(e) {
    this.userquery = e.target.value
    this.disabled = !e.target.value
    if (e.keyCode == 13 && !e.shiftKey) {
      this.submitQuery()
    }
  }

  jsMsgCallback(token) {
    if (token) {
      this.msg += token;
      const child = this.shadowRoot.querySelector('md-search');
      child.writeResponse(this.msg, this.userquery)
    }
  }

  submitQuery() {
      const textarea = this.renderRoot.getElementById('textarea');
      window.llmUserQuery = textarea.value;
      this.pyodide.globals.set("jsMsgCallback", (token) => this.jsMsgCallback(token));
      this.pyodide.runPythonAsync(`
        from js import llmUserQuery
        import llm
        chain = llm.create_chain(jsMsgCallback)
        await chain.ainvoke({"query": llmUserQuery})
        print("alive")
      `)
      textarea.value=""
  }

  render() {
    return html`
      <link rel="stylesheet" href="static/pico.min.css">
      <md-search></md-search>
      <textarea
        id="textarea"
        placeholder="${this.placeholder}"
        aria-label="${this.placeholder}"
        @keyup=${this.handleKeyup}
      >${this.userquery}</textarea>
      ${ this.disabled ?
        html`<button
                @click=${this.submitQuery}
                disabled type="submit">${this.buttonText}
              </button>`
        :
        html`<button
                @click=${this.submitQuery}
                type="submit">${this.buttonText}
              </button>`
      }
    `;
  }
}
consume({ context: pyodideContext })(Query.prototype, 'pyodide');
customElements.define('md-query', Query);
