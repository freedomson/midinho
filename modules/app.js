
import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { Task } from './node_modules/@lit/task/task.js';
import './query.js';
import OllamaApi from './api.js';
import './query-models-download.js';
import './header.js';
import './nav.js';
import './error.js';
import './loading.js';
import { pyodideContext, ollamamodelsContext } from './context.js';
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

  async setupPyodide() {
    this.pyodide = await loadPyodide({
      indexURL : './pyodide/',
      stdLibURL: './pyodide/python_stdlib.zip'
    });
    await this.pyodide.loadPackage("micropip");
    const micropip = this.pyodide.pyimport("micropip");

    await micropip.install("anyio")
    await micropip.install("requests")
    await micropip.install("pydantic")
    await micropip.install("zstandard")

    await this.pyodide.loadPackage('./wasm/jsonpatch-1.33-py2.py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/jsonpointer-3.0.0-py2.py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/pyyaml-6.0.2-cp313-cp313-pyodide_2025_0_wasm32.whl');
    await this.pyodide.loadPackage('./wasm/sqlalchemy-2.0.39-cp313-cp313-pyodide_2025_0_wasm32.whl');
    await this.pyodide.loadPackage('./wasm/sqlite3-1.0.0-cp313-cp313-pyodide_2025_0_wasm32.whl');
    await this.pyodide.loadPackage('./wasm/ollama-0.5.1-py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/langsmith-0.3.44-py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/langchain_text_splitters-0.3.8-py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/langchain_core-0.3.63-py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/requests_toolbelt-1.0.0-py2.py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/tenacity-9.1.2-py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/langchain_ollama-0.3.3-py3-none-any.whl');
    await this.pyodide.loadPackage('./wasm/langchain-0.3.25-py3-none-any.whl');

    await this.pyodide.loadPackage('./static/httpx-0.28.1-py3-none-any.whl');

    // console.log(micropip.freeze())
    await this.pyodide.runPythonAsync(`
      from pyodide.http import pyfetch
      response = await pyfetch("python/llm.py")
      with open("llm.py", "wb") as f:
          f.write(await response.bytes())

      # Preload classes
      import llm
    `)

  }

  _loadPythonSourceCodeTask = new Task(this, {
    task: async ([], {signal}) => {
      await this.getOllamaModels();
      await this.setupPyodide();
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
        this._loadPythonSourceCodeTask.render({
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
provide({ context: pyodideContext })(App.prototype, 'pyodide');
provide({ context: ollamamodelsContext })(App.prototype, 'ollamamodels');
customElements.define('md-app', App);