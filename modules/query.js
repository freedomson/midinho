import {LitElement, html, css} from './node_modules/lit-element/lit-element.js'
import './search.js';
import './query-models.js';
import './query-text.js';
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
    .query-container-wrapper {
      position: fixed;
      bottom: 0;
      width: 60vw;
      height: 160px;
      background-color: var(--pico-background-color);
    }
  `;

  static properties = {
    textarea: {type: Object},
    msgs: {type: Array},
    loading:  {type: Boolean}
  };

  constructor() {
    super();
    this.messageWelcome = 'What can I help with?';
    this.msgs = [];
    this.msgsRefs = []
    this.loading = false
  }

  firstUpdated() {
    this.mdQueryText = this.shadowRoot.querySelector('md-query-text');
    this.mdQueryModels = this.shadowRoot.querySelector('md-query-models');
  }

  isLoading(){
    return this.loading;
  }

  setLoading(value) {
    this.loading = value
  }

  async submitQuery(query) {

      this.setLoading(true)

      // Construct message
      let selectedModel = this.mdQueryModels.getSelectedModel()
      let msg = {
        id: this.msgs.length,
        query: query,
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
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      }, 0);

      this.pyodide.globals.set(
        "callback",
        (token) => msgEl.write.bind(msgEl)(token));

      this.pyodide.globals.set(
        "donecallback",
        () => {
          msgEl.end.bind(msgEl)()
          this.setLoading(false)
          this.mdQueryText.enable()
        });

        this.pyodide.globals.set(
          "cancelcallback",
          () => {
            this.setLoading(false)
            this.mdQueryText.enable()
          });

      this.pyodide.runPythonAsync(`
        from js import pythonQueryStr, pythonSelectedModel, Prism
        try:
          llm.task = llm.run_query(pythonQueryStr, pythonSelectedModel, callback, donecallback, cancelcallback)
        except Exception as e:
            print("Caught a generic exception:", e)
      `)

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
        <div class="query-container-wrapper" >
          <hr class="pico-background-grey-50" />
          <md-query-text
            .isLoading=${this.isLoading.bind(this)}
            .submitQuery=${this.submitQuery.bind(this)}>
          </md-query-text>
          <md-query-models></md-query-models>
        </div>
    `;
  }
}
consume({ context: pyodideContext })(Query.prototype, 'pyodide');
customElements.define('md-query', Query);
