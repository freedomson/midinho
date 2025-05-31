import {LitElement, html, css} from './node_modules/lit-element/lit-element.js'
import { ref, createRef } from './node_modules/lit-html/directives/ref.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { pyodideContext, ollamamodelsContext } from './context.js';
import './search.js';
import './query-models.js';

export class Query extends LitElement {

  static styles = css`
    hr {
      padding: 0;
      margin: 0;
    }
    #query-welcome {
      text-align: center;
      display: block;
    }
    #query-response {
      margin-bottom: 160px;
      float: left;
    }
    #query-query {
      margin-bottom: 0.5rem;
    }
    #query-button {
      width: 30vw;
      float: left;
    }
    #query-container {
      transform: scale(0.75);
    }
    #query-container-wrapper{
      position: fixed;
      bottom: 0;
      width: 60vw;
      height: 160px;
      background-color: var(--pico-background-color);
    }
  `;

  static properties = {
    textarea: {type: Object},
    disabled: {type: Boolean},
    msgs: {type: Array}
  };

  constructor() {
    super();
    this.messageWelcome = 'What can I help with?';
    this.placeholder = 'Ask anything';
    this.buttonText = 'Ask';
    this.disabled = true
    this.msgs = [];
    this.msgsRefs = []
  }

  firstUpdated() {
    this.textarea = this.renderRoot.getElementById('query-query');
    this.textarea.focus();
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

      let mdQueryModels = this.shadowRoot.querySelector('md-query-models');
      let selectedModel = mdQueryModels.getSelected.bind(mdQueryModels)();

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
        window.pythonQueryStr = msg.query;
        window.pythonSelectedModel = selectedModel
        // msgEl.write.bind(msgEl)(window.pythonSelectedModel)
        this.pyodide.globals.set(
            "responseWriteCallback",
            (token) => msgEl.write.bind(msgEl)(token));
        this.pyodide.runPythonAsync(`
          from js import pythonQueryStr, pythonSelectedModel
          import llm
          chain = llm.create_chain(pythonSelectedModel, responseWriteCallback)
          await chain.ainvoke({"query": pythonQueryStr})
        `)
        queryEl.value = ""
        this.disabled = true
      }, 0)
  }

  render() {
    return html`
        <link rel="stylesheet" href="css/pico.sand.min.css">
        <small id="query-welcome">${this.messageWelcome}</small>
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
              placeholder="${this.placeholder}"
              aria-label="${this.placeholder}"
              @keyup=${this.handleKeyup}
            >${this.userquery}</textarea>
            <fieldset class="group">
              ${ this.disabled ?
                html`<div id="query-button" @click=${this.submitQuery} disabled type="submit">${this.buttonText}</div>`
                :
                html`<div id="query-button" @click=${this.submitQuery} type="submit">${this.buttonText}</div>`
              }
              <md-query-models .ollamamodels=${this.ollamamodels}></md-query-models>
            </fieldset>
          </div>
        </div>
    `;
  }
}
consume({ context: ollamamodelsContext })(Query.prototype, 'ollamamodels');
consume({ context: pyodideContext })(Query.prototype, 'pyodide');
customElements.define('md-query', Query);
