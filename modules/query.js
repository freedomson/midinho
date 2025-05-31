import {LitElement, html, css} from '/static/lit-core.min.js'
import { consume } from 'https://esm.sh/@lit-labs/context';
import { pyodideContext } from './context.js';
import './search.js';

export class Query extends LitElement {

  static styles = css`
    .container {
      position: fixed;
      bottom: 0;
      width: 60vw;
      min-height: 1vh;
    }
  `;

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

  submitQuery() {
      let responseEl = this.shadowRoot.querySelector('md-search')
      let userQuery = this.renderRoot.getElementById('userQuery')
      window.llmUserQuery = userQuery.value;
      this.pyodide.globals.set(
          "responseWriteCallback",
          (token) => responseEl.write.bind(responseEl)(token));
      this.pyodide.runPythonAsync(`
        from js import llmUserQuery
        import llm
        chain = llm.create_chain(responseWriteCallback)
        await chain.ainvoke({"query": llmUserQuery})
      `)
      userQuery.value = ""
      this.disabled = true
  }

  render() {
    return html`
      <link rel="stylesheet" href="static/pico.min.css">
      <md-search></md-search>
      <main class="container">
      <textarea
        id="userQuery"
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
      </main>
    `;
  }
}
consume({ context: pyodideContext })(Query.prototype, 'pyodide');
customElements.define('md-query', Query);
