import {LitElement, html, css} from './node_modules/lit-element/lit-element.js'
import './search.js';
import './query-text.js';
import { pyodideContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';
import { store } from './store.js';
export class Query extends LitElement {

  static styles = [picocss, css`
    hr {
      padding: 0;
      margin: 0;
    }
    .md-query-welcome {
      text-align: center;
      display: block;
      margin-bottom: 1rem;
    }
    #query-response {
      float: left;
      width: 100%;
    }
  `];

  static properties = {
    textarea: {type: Object},
    msgs: {type: Array},
    loading:  {type: Boolean}
  };

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this);
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    super.disconnectedCallback();
  }

  constructor() {
    super();
    this.messageWelcome = 'What can I help with?';
    this.msgs = [];
    this.msgsRefs = []
    this.loading = false
  }

  firstUpdated() {
    this.mdQueryText = this.shadowRoot.querySelector('md-query-text');
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
      let selectedModel = store.model
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
          msgEl.end.bind(msgEl)((()=>{
            this.setLoading(false)
            this.mdQueryText.enable()
          }).bind(this))
        });

        this.pyodide.globals.set(
          "cancelcallback",
          () => {});

      this.pyodide.runPythonAsync(`
        from js import pythonQueryStr, pythonSelectedModel, Prism
        try:
          llm.task = llm.run_query(pythonQueryStr, pythonSelectedModel, callback, donecallback, cancelcallback)
        except Exception as e:
            print("Caught a generic exception:", e)
      `)

  }

  cancelCallBack(){
    let msgEl = this.renderRoot.getElementById(`md-search-${this.msgs.length}`);
    msgEl.cancel.bind(msgEl)((()=>{
      this.setLoading(false)
      this.mdQueryText.enable()
    }).bind(this))
  }

  render() {
    return html`
        <p class="md-query-welcome">
          ${this.messageWelcome}
        </p>
        <div id="query-response">
          ${this.msgs.map((msg, index) => html`
            <md-search
              id="md-search-${index+1}"
              .speak=${store.speak}
              .worker=${store.speakerWorker}
              .msg=${msg}
              ></md-search>
          `)}
        </div>
        <md-query-text
          .cancelCallBack=${this.cancelCallBack.bind(this)}
          .isLoading=${this.isLoading.bind(this)}
          .submitQuery=${this.submitQuery.bind(this)}>
        </md-query-text>
    `;
  }
}
consume({ context: pyodideContext })(Query.prototype, 'pyodide');
customElements.define('md-query', Query);
