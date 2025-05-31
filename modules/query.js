import {LitElement, html, css} from './node_modules/lit-element/lit-element.js'
import { ref, createRef } from './node_modules/lit-html/directives/ref.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { pyodideContext } from './context.js';
import './search.js';

export class Query extends LitElement {

  static styles = css`
    hr {
      padding: 0;
      margin: 0;
    }

    #query-response {
      margin-bottom: 160px;
      float: left;
    }
    #query-query {

    }
    #query-container {
      transform: scale(0.75);
    }
    #query-container-wrapper{
      position: fixed;
      bottom: 0;
      width: 60vw;
      height: 160px;
      background: #FFF;
    }
  `;

  static properties = {
    textarea: {type: Object},
    disabled: {type: Boolean},
    msgs: {type: Array}
  };

  constructor() {
    super();
    this.placeholder = 'Ask anything';
    this.buttonText = 'Ask';
    this.disabled = true
    this.msgs = [];
    this.msgsRefs = []
  }

  isEmptyAfterTrim(str) {
    return str.replace(/\s/g, '') === '';
  }
  handleKeyup(e) {
    this.userquery = e.target.value
    this.disabled = !e.target.value
    if ( !this.isEmptyAfterTrim(this.userquery) && e.keyCode == 13 && !e.shiftKey ) {
      this.submitQuery()
    }
  }

  submitQuery() {
      let queryEl = this.renderRoot.getElementById('query-query')
      let msg = {
        id: this.msgs.length,
        query: queryEl.value,
        response: ""
      }

      this.msgs = [...this.msgs, msg];
      this.msgsRefs = this.msgs.map(() => createRef());

      setTimeout(()=>{
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
        let msgEl = this.msgsRefs[(msg.id)].value
        window.pythonQueryEl = msg.query;
        // msgEl.write.bind(msgEl)("Test")
        this.pyodide.globals.set(
            "responseWriteCallback",
            (token) => msgEl.write.bind(msgEl)(token));
        this.pyodide.runPythonAsync(`
          from js import pythonQueryEl
          import llm
          chain = llm.create_chain(responseWriteCallback)
          await chain.ainvoke({"query": pythonQueryEl})
        `)
        queryEl.value = ""
        this.disabled = true
      }, 0)
  }

  render() {
    return html`
        <link rel="stylesheet" href="css/pico.min.css">
        <div id="query-response">
          ${this.msgs.map((msg, index) => html`
            <md-search
              ${ref(this.msgsRefs[index])}
              .msg=${msg}
              ></md-search>
          `)}
        </div>
        <div id="query-container-wrapper" aling="center">
          <hr class="pico-background-grey-50" />
          <div id="query-container">
            <textarea
              id="query-query"
              @keyup=${this.handleKeyup}
            >${this.userquery}</textarea>
            ${ this.disabled ?
              html`<div
                      @click=${this.submitQuery}
                      disabled type="submit">${this.buttonText}
                    </div>`
              :
              html`<div
                      @click=${this.submitQuery}
                      type="submit">${this.buttonText}
                    </div>`
            }
          </div>
        </div>
    `;
  }
}
consume({ context: pyodideContext })(Query.prototype, 'pyodide');
customElements.define('md-query', Query);
