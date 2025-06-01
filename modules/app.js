
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
    this.pyodide = await loadPyodide();
    await this.pyodide.loadPackage("micropip");
    const micropip = this.pyodide.pyimport("micropip");
    await micropip.install("anyio")
    await micropip.install('langchain==0.3.25')
    await micropip.install('langchain_ollama==0.3.3')
    await micropip.install('langchain_community==0.3.17')
    await micropip.uninstall('httpx')
    await this.pyodide.loadPackage('./static/httpx-0.28.1-py3-none-any.whl')
    // console.log(micropip.freeze())
    await this.pyodide.runPythonAsync(`
      from pyodide.http import pyfetch
      response = await pyfetch("./python/llm.py")
      with open("llm.py", "wb") as f:
          f.write(await response.bytes())
    `)
    this.pyodide.pyimport("llm");
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