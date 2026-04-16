import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import OllamaApi from './api.js';
import { ollamamodelsContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';

export class QueryModelsDownload extends LitElement {
  static styles = [picocss, css`
    dialog { font-size: 1rem; }
    #md-query-models-download { margin-bottom: 0px; min-width: 3rem; }
    #md-query-models-download-img{
      height: 25px;
      width: 25px;
      background-color: light-dark(transparent, #ffffff);
      padding: 5px;
    }
    #md-query-models-download-status-progress{ text-align: right; }
    .memline { font-size: 0.9rem; opacity: 0.85; margin: 0.25rem 0 0; }
    .memerr { font-style: italic; }
  `];

  static properties = {
    ollamamodels:{type: Array},
    defaultModels: {type: Array},
    busy: {type: Boolean},
    downloadingProgressValue: {type: Number},
    downloadingProgressStatus: {type: String},
    downloadingProgressStatusProgress: {type: String},
    callback: {type: Object},
    abortController: {type: Object},

    // ✅ NEW: memory state
    freeMemoryMb: { type: Number },
    memoryError: { type: String },
    memoryEndpoint: { type: String },
    memoryIntervalMs: { type: Number },
  };

  constructor() {
    super();
    this.busy = false;
    this.callback = false;
    this.ollamamodels = [];
    this.abortController = new AbortController();
    this.downloadingProgressValue = 0;
    this.downloadingProgressStatus = "";
    this.downloadingProgressStatusProgress = "";

    // ✅ NEW: memory defaults
    this.freeMemoryMb = null;       // <-- variable you asked for
    this.memoryError = "";
    this.memoryEndpoint = "http://localhost:8081/free-memory";
    this.memoryIntervalMs = 1000;
    this._memTimer = null;

    this.defaultModels = [
      { "name": "smollm2:135m", "size": 0.271 * 1024 * 1024 * 1024, "context": "8K", "input": ["text"] },
      { "name": "gemma3:4b", "size": 3.3 * 1024 * 1024 * 1024, "context": "128K", "input": ["text","image"] },
      { "name": "gemma3:12b", "size": 8.1 * 1024 * 1024 * 1024, "context": "128K", "input": ["text","image"] },
      { "name": "llama3.1:8b", "size": 4.9 * 1024 * 1024 * 1024, "context": "128K", "input": ["text"] },
      { "name": "llama3.2:3b", "size": 2 * 1024 * 1024 * 1024, "context": "128K", "input": ["text"] },
      { "name": "deepseek-r1:14b", "size": 9.0 * 1024 * 1024 * 1024, "context": "128K", "input": ["text"] },
      { "name": "deepseek-r1:1.5b", "size": 1.1 * 1024 * 1024 * 1024, "context": "128K", "input": ["text"] },
      { "name": "qwen3:8b", "size":  5.2 * 1024 * 1024 * 1024, "context": "40K", "input": ["text"] },
      { "name": "mistral:7b", "size":  4.4 * 1024 * 1024 * 1024, "context": "40K", "input": ["text"] },
      { "name": "gemma4:e4b", "size":  9.6 * 1024 * 1024 * 1024, "context": "128K", "input": ["text","image"] }
    ];
  }

  connectedCallback() {
    super.connectedCallback();

    // Setup context consumer
    this._consumer = consume({ context: ollamamodelsContext })(QueryModelsDownload.prototype, 'ollamamodels');

    // ✅ NEW: start memory polling
    this._fetchFreeMemory();
    // this._memTimer = setInterval(() => this._fetchFreeMemory(), this.memoryIntervalMs);
  }

  disconnectedCallback() {
    if (this._consumer) this._consumer.dispose();

    // ✅ NEW: stop polling
    if (this._memTimer) {
      clearInterval(this._memTimer);
      this._memTimer = null;
    }

    super.disconnectedCallback();
  }

  // ✅ NEW: fetch + store free memory (MB) into this.freeMemoryMb
  async _fetchFreeMemory() {
    try {
      const res = await fetch(this.memoryEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        this.memoryError = `endpoint error (${res.status})`;
        this.freeMemoryMb = null;
        this.requestUpdate();
        return;
      }

      const data = await res.json();
      const mb = Number(data.free_mb);

      if (Number.isFinite(mb)) {
        this.freeMemoryMb = mb;
        this.memoryError = "";
      } else {
        this.freeMemoryMb = null;
        this.memoryError = "invalid payload";
      }

      this.requestUpdate();
    } catch {
      this.freeMemoryMb = null;
      this.memoryError = "fetch failed";
      this.requestUpdate();
    }
  }

  updateModels() {
    this.dispatchEvent(new CustomEvent('update-models', {
      detail: this.ollamamodels,
      bubbles: true,
      composed: true,
    }));
  }

  toggleBusy() {
    this.busy = !this.busy ;
    this.requestUpdate();
  }

  cancelDownload() {
    if (this.abortController) {
      this.abortController.abort();
      this.toggleBusy()
      this.abortController = new AbortController();
    }
  }

  async downloadModel(modelName) {
    this.toggleBusy()
    const response = await fetch(OllamaApi.getEndpointByOperation('pull'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
      signal: this.abortController.signal
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      let done, value;
      try {
        ({ done, value } = await reader.read());
      } catch (err) {
        if (err.name === 'AbortError') {
          console.warn('Stream read aborted');
          return;
        }
        throw err;
      }

      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      try {
        let r = JSON.parse(chunk)

        if (r?.total && r?.completed){
          let completed = this.roundTo2Decimals(r.completed/1024/1024)
          let total = this.roundTo2Decimals(r.total/1024/1024)
          let perc = total > 0 ? this.roundTo2Decimals(completed/total*100) : 100
          this.downloadingProgressValue = completed / total;
          this.downloadingProgressStatus = `${modelName}: ${r.status}`
          this.downloadingProgressStatusProgress = `${completed} MB / ${total} MB (${perc}%)`
          this.requestUpdate();
        } else if (r?.status) {
          this.downloadingProgressStatus = `${modelName}: ${r.status}`
        }
      } catch (error) {
        console.log("Models Download",error)
      }
    }

    this.ollamamodels = await OllamaApi.getOllamaModels()
    this.toggleBusy()
    this.requestUpdate();
    this.finish()
  }

  finish() {
    this.updateModels()
    if (this.callback) this.callback()
  }

  roundTo2Decimals(num) {
    return (Math.round(num * 100) / 100).toFixed(2);
  }

  async deleteModel(modelName) {
    this.toggleBusy()
    const response = await fetch(OllamaApi.getEndpointByOperation('delete'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (response.ok) {
      this.ollamamodels = await OllamaApi.getOllamaModels()
      this.toggleBusy()
    } else {
      const error = await response.text();
      console.error(`❌ Failed to delete model: ${error}`);
    }
  }

  mergeArray(arr1,arr2){
    const merged = [...arr1,...arr2];

    arr2.forEach(item2 => {
      const index = merged.findIndex(item1 => item1.id === item2.id);
      if (index >= 0) {
        for (let key in item2) {
          if (merged[index][key] === undefined || merged[index][key] === null || merged[index][key] === "") {
            merged[index][key] = item2[key];
          }
        }
      } else {
        merged.push(item2);
      }
    });
    return merged;
  }

  getModels(){
    const a = this.mergeArray(OllamaApi.models, this.defaultModels)
    const u = Array.from(new Map(a.map(item => [item.name, item])).values());
    return u.sort((a, b) => a.name.localeCompare(b.name))
  }

  // ✅ NEW: render helper to show memory line
  renderFreeMemoryLine() {
    if (this.memoryError) {
      return html`<div class="memline">Free memory: <span class="memerr">${this.memoryError}</span></div>`;
    }
    if (this.freeMemoryMb === null) {
      return html`<div class="memline">Free memory: <em>loading…</em></div>`;
    }
    return html`<div class="memline">Free memory: <strong>${this.freeMemoryMb}</strong> MB</div>`;
  }

  render() {
    return html`
      <link rel="stylesheet" href="./css/pico.sand.min.css">
      <dialog open>
        <article>
          <header>
            <div class="grid">
              <div>
                <h1>Download Model</h1>
                <!-- ✅ show free memory in header -->
                ${this.renderFreeMemoryLine()}
              </div>
              <div align="right">
                ${
                  !this.ollamamodels.length ?
                    html`<mark>Choose a Model to Download.</mark>`
                    :
                    this.busy ? "" : html`<button class="outline contrast" @click=${this.finish.bind(this)}>Close</button>`
                }
              </div>
            </div>
          </header>

          ${this.busy ? html`
            <progress value="${this.downloadingProgressValue}" max="1"></progress>
            <div class="grid">
              <span aria-busy="true">${this.downloadingProgressStatus}</span>
              <span id="md-query-models-download-status-progress">${this.downloadingProgressStatusProgress}</span>
            </div>
            <br/>
            <div id="md-query-models-download" @click=${this.cancelDownload.bind(this)} type="submit">
              Cancel
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Memory</th>
                <th scope="col">Size</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              ${  this.freeMemoryMb ?
                this.getModels().map((model) => html`
                  <tr>
                    <th scope="row">
                      <a href="https://ollama.com/library/${model.name}">${model.name}</a>
                    </th>
                    <td>
                    ${
                      this.freeMemoryMb > (model.size / 1024 / 1024) ?
                      "Recommended" : "-"
                    }
                    </td>
                    <td>${this.roundTo2Decimals(model.size / 1024 / 1024 / 1024)} GB</td>
                    <td>
                      ${
                        !OllamaApi.models.some(current => current.name === model.name) ?
                          html`<div
                            id="md-query-models-download"
                            class="outline contrast"
                            @click=${this.downloadModel.bind(this, model.name)}
                            type="submit"
                            ?disabled=${this.busy}
                          >
                            <img id="md-query-models-download-img" src="./css/download.png">
                          </div>`
                          :
                          html`<div
                            id="md-query-models-download"
                            class="outline contrast"
                            @click=${this.deleteModel.bind(this, model.name)}
                            type="submit"
                            ?disabled=${this.busy}
                          >
                            <img id="md-query-models-download-img" src="./css/delete.png">
                          </div>`
                      }
                    </td>
                  </tr>
                `) : ""
              }
            </tbody>
          </table>

        </article>
      </dialog>
    `;
  }
}

consume({ context: ollamamodelsContext })(QueryModelsDownload.prototype, 'ollamamodels');
customElements.define('md-query-models-download', QueryModelsDownload);
