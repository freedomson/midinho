
import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { Task } from './node_modules/@lit/task/task.js';
import { provide } from './node_modules/@lit-labs/context/index.js';
import './query.js';
import './header.js';
import './error.js';
import { pyodideContext, ollamamodelsContext } from './context.js';

class App extends LitElement {

  static properties = {
    pyodide: {type: Object},
    ollamamodels: {type: Object}
  };

  static styles = css`
    #app-container-wrapper {
      width: 100vw;
      padding-left: 20vw;
    }
    #app-container {
      width: 60vw;
    }
  `;

  async getOllamaModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) throw new Error('ollama-connection-error-api');
      const data = await response.json();
      const modelNames = data.models.map(model => model.name);
      console.log('Available models:', modelNames);
      this.ollamamodels = modelNames;
      return modelNames;
    } catch (error) {
      console.error('Error fetching model list:', error);
      throw new Error('ollama-connection-error-api');
    }
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
      response = await pyfetch("midinho/python/llm.py")
      with open("llm.py", "wb") as f:
          f.write(await response.bytes())
    `)

  }

  _loadPythonSourceCodeTask = new Task(this, {
    task: async ([], {signal}) => {
      // return;
      await this.getOllamaModels();
      await this.setupPyodide();
    },
    args: () => []
  });

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.sand.min.css">
      <div id="app-container-wrapper">
      <div id="app-container">
      ${this._loadPythonSourceCodeTask.render({
        initial: () => html`<br /><p>Waiting to start task</p>`,
        pending: () => html`
          <br />
          <md-header></md-header>
          <p align="center">Loading components...</p>
          <progress />
          `,
        complete: (value) => html`
              <md-header></md-header>
              <md-query></md-query>
        `,
        error: (error) => html`
          <md-header></md-header>
          <md-error .error=${error}></md-error>
        `,
      })}
      </div>
      </div>
    `;
  }
}
provide({ context: pyodideContext })(App.prototype, 'pyodide');
provide({ context: ollamamodelsContext })(App.prototype, 'ollamamodels');
customElements.define('md-app', App);