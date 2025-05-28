
import { LitElement, html } from '/static/lit-core.min.js'
import { Task } from 'https://cdn.jsdelivr.net/npm/@lit/task@1.0.2/+esm'
import { provide } from 'https://esm.sh/@lit-labs/context';
import './page.js';
import { pyodideContext } from './context.js';

class App extends LitElement {

  static properties = {
    pyodide: {type: Object},
  };

  async setupPyodide() {
    this.pyodide = await loadPyodide();
    await this.pyodide.loadPackage("micropip");
    const micropip = this.pyodide.pyimport("micropip");
    await micropip.install("anyio")
    await micropip.install('langchain==0.3.25')
    await micropip.install('langchain_ollama==0.3.3')
    await micropip.install('langchain_community==0.3.17')
    await micropip.uninstall('httpx')
    await this.pyodide.loadPackage('/static/httpx-0.28.1-py3-none-any.whl')
    // pyodide.globals.set("output_callback", (token) => streamOutput(token));
    // console.log(micropip.freeze())
    await this.pyodide.runPythonAsync(`
      from pyodide.http import pyfetch
      response = await pyfetch("/python/llm.py")
      with open("llm.py", "wb") as f:
          f.write(await response.bytes())
    `)
    this.pyodide.pyimport("llm");
  }

  _loadPythonSourceCodeTask = new Task(this, {
    task: async ([], {signal}) => {
      // return;
      await this.setupPyodide();
    },
    args: () => []
  });

  render() {
    return html`
      ${this._loadPythonSourceCodeTask.render({
        initial: () => html`<p>Waiting to start task</p>`,
        pending: () => html`
        <link rel="stylesheet" href="static/pico.min.css">
        <p align="center">Loading components</p>
        <progress />
        `,
        complete: (value) => html`<md-page />`,
        error: (error) => html`<p>Oops, something went wrong: ${error}</p>`,
      })}
    `;
  }
}
provide({ context: pyodideContext })(App.prototype, 'pyodide');
customElements.define('md-app', App);