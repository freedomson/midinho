
import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { Task } from './node_modules/@lit/task/task.js';
import './query.js';
import OllamaApi from './api.js';
import './query-models-download.js';
import './header.js';
import './nav.js';
import './error.js';
import './loading.js';
import { ollamamodelsContext } from './context.js';
import { provide } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';
import { store } from './store.js';
class App extends LitElement {

  static properties = {
    pyodide: {type: Object},
    ollamamodels: {type: Array},
    globals: {type: Object}
  };

  constructor() {
    super();
    this.ollamamodels = [];
  }

  static styles = [picocss, css``];

  async getOllamaModels() {
    await OllamaApi.getOllamaModels();
    this.ollamamodels = OllamaApi.modelNames;
  }

  _loadSourceCodeTask = new Task(this, {
    task: async ([], {signal}) => {
      await this.getOllamaModels();
    },
    args: () => []
  });

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('update-models', this.handleUpdateModels);
    store.subscribe(this);
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    this.removeEventListener('update-models', this.handleUpdateModels);
    super.disconnectedCallback();
  }

  handleUpdateModels = (e) => {
    this.ollamamodels = e.detail;
    this.requestUpdate();
    const q = this.renderRoot?.querySelector('md-nav')?.shadowRoot.querySelector('md-query-models')
    if (q)
      q.dispatchEvent(new CustomEvent('context-updated-manual', {
        detail: { value: this.ollamamodels },
        bubbles: false,
        composed: true
      }));
  };

  onSuccess(){
    return html`
      <md-nav></md-nav>
      ${
        !this.ollamamodels.length ?
        html `<md-query-models-download></md-query-models-download>`
        :
        html `<md-query></md-query>`
      }
    `
  }

  render() {
    return html`
      <link rel="stylesheet" href="./css/pico.sand.min.css">
      <div class="md-app-container-wrapper">
      ${
        this._loadSourceCodeTask.render({
          initial: () => html`<br /><p>Waiting to start task</p>`,
          pending: () => html`
            <br />
            <md-header></md-header>
            <progress ></progress>
            `,
          complete: (value) => this.onSuccess(),
          error: (error) => html`
            <md-header></md-header>
            <md-error .error=${error}></md-error>
          `,
        })
      }
      ${
        // Generic loading capability
        // Used after first load
        // TODO: Single load component
        store.loading ? html `<md-loading .loading=${store.loading}></md-loading>`: ``
      }
      </div>
    `;
  }
}

provide({ context: ollamamodelsContext })(App.prototype, 'ollamamodels');
customElements.define('md-app', App);