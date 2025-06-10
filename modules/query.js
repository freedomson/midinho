import {LitElement, html, css} from './node_modules/lit-element/lit-element.js'
import { ref, createRef } from './node_modules/lit-html/directives/ref.js';
import './search.js';
import './query-models.js';
import { pyodideContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';

export class Query extends LitElement {

  static styles = css`
    hr {
      padding: 0;
      margin: 0;
    }
    #query-welcome {
      text-align: center;
      display: block;
      margin-bottom: 1rem;
    }
    #query-response {
      margin-bottom: 160px;
      float: left;
    }
    #query-query {
      margin-bottom: 0.5rem;
      max-height: 7rem;
      min-height: 5rem;
    }
    #query-button {
      width: 30vw;
      float: left;
    }
    #query-container {

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
    if (this.isEmptyAfterTrim(e.target.value)){
      e.target.value = ""
      return;
    }
    this.userquery = e.target.value
    this.disabled = !e.target.value
    if ( e.keyCode == 13 && !e.shiftKey ) {
      this.submitQuery()
    }
  }

  getSelectedModel() {
    let mdQueryModels = this.shadowRoot.querySelector('md-query-models');
    return mdQueryModels.getSelectedModel.bind(mdQueryModels)();
  }

  async submitQuery() {

      // Construct message
      let selectedModel = this.getSelectedModel()
      let queryEl = this.renderRoot.getElementById('query-query')
      let msg = {
        id: this.msgs.length,
        query: queryEl.value,
        model: selectedModel,
        response: ""
      }

      this.msgs = [...this.msgs, msg];

      // Set bridge vars
      window.pythonQueryStr = msg.query;
      window.pythonSelectedModel = selectedModel
      window.Prism = Prism

      // Update UI with message
      await this.requestUpdate();

      let msgEl = this.renderRoot.getElementById(`md-search-${this.msgs.length}`);

      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 0);

      this.pyodide.globals.set(
        "callback",
        (token) => msgEl.write.bind(msgEl)(token));

      this.pyodide.globals.set(
        "donecallback",
        () => msgEl.end.bind(msgEl)());

      this.pyodide.runPythonAsync(`
        from js import pythonQueryStr, pythonSelectedModel, Prism
        try:
          await llm.run_query(pythonQueryStr, pythonSelectedModel, callback, donecallback)
        except Exception as e:
            print("Caught a generic exception:", e)
      `)

      queryEl.value = ""
      this.disabled = true

  }

  render() {
    return html`
        <link rel="stylesheet" href="css/pico.sand.min.css">
        <small id="query-welcome">${this.messageWelcome}</small>
        <div id="query-response">
          ${this.msgs.map((msg, index) => html`
            <md-search
              id="md-search-${index+1}"
              .msg=${msg}
              ></md-search>
          `)}
        </div>
        <div
          id="query-container-wrapper" >
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
              <md-query-models></md-query-models>
            </fieldset>
          </div>
        </div>
    `;
  }
}
consume({ context: pyodideContext })(Query.prototype, 'pyodide');
customElements.define('md-query', Query);
