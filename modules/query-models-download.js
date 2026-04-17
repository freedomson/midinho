import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import OllamaApi from './api.js';
import { ollamamodelsContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss, picocsscolor } from './style.js';

export class QueryModelsDownload extends LitElement {
  static styles = [
    picocss,
    picocsscolor,
    css`
      dialog { font-size: 1rem; }
      .btn-mini { margin-bottom: 0; min-width: 1rem; }
      #status-progress { text-align: right; }
      .memline { font-size: 0.9rem; opacity: 0.85; margin: 0.25rem 0 0; }
      .memerr { font-style: italic; }
      .delta { display: inline-block; }
      .actions { white-space: nowrap; }
    `
  ];

  static properties = {
    ollamamodels: { type: Array },
    defaultModels: { type: Array },

    busy: { type: Boolean },
    downloadingProgressValue: { type: Number },
    downloadingProgressStatus: { type: String },
    downloadingProgressStatusProgress: { type: String },

    callback: { type: Object },
    abortController: { type: Object },

    // Memory polling state
    freeMemoryMb: { type: Number },
    memoryError: { type: String },
    memoryEndpoint: { type: String },
    memoryIntervalMs: { type: Number }
  };

  constructor() {
    super();

    // UI state
    this.busy = false;
    this.callback = null;
    this.ollamamodels = [];

    // Download stream abort controller
    this.abortController = new AbortController();

    // Progress
    this.downloadingProgressValue = 0;
    this.downloadingProgressStatus = "";
    this.downloadingProgressStatusProgress = "";

    // Labels
    this.text = {
      download: "Download",
      delete: "Delete",
      cancel: "Cancel",
      close: "Close",
      title: "Download Model",
    };

    // Memory defaults
    this.freeMemoryMb = null;
    this.memoryError = "";
    this.memoryEndpoint = "http://localhost:8081/free-memory";
    this.memoryIntervalMs = 1000;

    // Internal polling control
    this._memTimer = null;
    this._memAbort = null;     // abort in-flight memory fetch
    this._memInFlight = false; // prevent overlapping polls

    // Model catalog
    this.defaultModels = [
      { "name": "smollm2:135m", "size": 0.271 * 1024 * 1024 * 1024, "context": "8K", "input": ["text"] },
      { "name": "gemma3:4b", "size": 3.3 * 1024 * 1024 * 1024, "context": "128K", "input": ["text", "image"] },
      { "name": "gemma3:12b", "size": 8.1 * 1024 * 1024 * 1024, "context": "128K", "input": ["text", "image"] },
      { "name": "llama3.1:8b", "size": 4.9 * 1024 * 1024 * 1024, "context": "128K", "input": ["text"] },
      { "name": "llama3.2:3b", "size": 2 * 1024 * 1024 * 1024, "context": "128K", "input": ["text"] },
      { "name": "deepseek-r1:14b", "size": 9.0 * 1024 * 1024 * 1024, "context": "128K", "input": ["text"] },
      { "name": "deepseek-r1:1.5b", "size": 1.1 * 1024 * 1024 * 1024, "context": "128K", "input": ["text"] },
      { "name": "qwen3:8b", "size": 5.2 * 1024 * 1024 * 1024, "context": "40K", "input": ["text"] },
      { "name": "mistral:7b", "size": 4.4 * 1024 * 1024 * 1024, "context": "40K", "input": ["text"] },
      { "name": "gemma4:e4b", "size": 9.6 * 1024 * 1024 * 1024, "context": "128K", "input": ["text", "image"] }
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this._startMemoryPolling();
  }

  disconnectedCallback() {
    this._stopMemoryPolling();
    this._abortMemoryFetch();
    super.disconnectedCallback();
  }

  /* ---------------- Memory Polling ---------------- */

  _startMemoryPolling() {
    if (this._memTimer) return;

    // immediate refresh
    this._fetchFreeMemory();

    // periodic refresh
    this._memTimer = setInterval(
      () => this._fetchFreeMemory(),
      this.memoryIntervalMs
    );
  }

  _stopMemoryPolling() {
    if (this._memTimer) {
      clearInterval(this._memTimer);
      this._memTimer = null;
    }
  }

  _abortMemoryFetch() {
    if (this._memAbort) {
      try { this._memAbort.abort(); } catch {}
      this._memAbort = null;
    }
  }

  async _fetchFreeMemory() {
    // Prevent overlap if the endpoint is slow
    if (this._memInFlight) return;
    this._memInFlight = true;

    // Abort previous memory fetch if any
    this._abortMemoryFetch();
    this._memAbort = new AbortController();

    try {
      const res = await fetch(this.memoryEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: this._memAbort.signal
      });

      if (!res.ok) {
        this._setMemoryState(null, `endpoint error (${res.status})`);
        return;
      }

      const data = await res.json();
      const mb = Number(data.free_mb);

      if (Number.isFinite(mb)) {
        // Only update if changed (reduces unnecessary renders)
        if (this.freeMemoryMb !== mb || this.memoryError) {
          this.freeMemoryMb = mb;
          this.memoryError = "";
        }
      } else {
        this._setMemoryState(null, "invalid payload");
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        // ignore aborted memory polling fetch
      } else {
        this._setMemoryState(null, "fetch failed");
      }
    } finally {
      this._memInFlight = false;
    }
  }

  _setMemoryState(mbOrNull, errMsg) {
    const changed =
      this.freeMemoryMb !== mbOrNull ||
      this.memoryError !== errMsg;

    if (changed) {
      this.freeMemoryMb = mbOrNull;
      this.memoryError = errMsg || "";
    }
  }

  renderFreeMemoryLine() {
    if (this.memoryError) {
      return html`
        <div class="memline">
          Free memory:
          <span class="memerr">${this.memoryError}</span>
        </div>
      `;
    }
    if (this.freeMemoryMb === null) {
      return html`
        <div class="memline">
          Free memory: <em>loading…</em>
        </div>
      `;
    }
    return html`
      <div class="memline">
        Free memory: <strong>${this.freeMemoryMb}</strong> MB
      </div>
    `;
  }

  /* ---------------- Model List / Merge ---------------- */

  mergeArray(arr1, arr2) {
    // Prefer arr1 items, fill gaps from arr2 by name
    const map = new Map();
    for (const item of [...arr2, ...arr1]) {
      if (!item?.name) continue;
      const prev = map.get(item.name) || {};
      map.set(item.name, { ...item, ...prev });
    }
    return Array.from(map.values());
  }

  getModels() {
    const merged = this.mergeArray(OllamaApi.models || [], this.defaultModels || []);
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }

  /* ---------------- UI / State ---------------- */

  updateModels() {
    this.dispatchEvent(new CustomEvent('update-models', {
      detail: this.ollamamodels,
      bubbles: true,
      composed: true,
    }));
  }

  setBusy(value) {
    this.busy = value;

    // Optional: reduce load while download/delete running
    // Comment out these two lines if you want memory to keep updating while busy
    // if (this.busy) this._stopMemoryPolling();
    // else this._startMemoryPolling();
  }

  cancelDownload() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = new AbortController();
    }
    this.setBusy(false);
  }

  finish() {
    this.updateModels();
    if (this.callback) this.callback();
  }

  roundTo2Decimals(num) {
    return (Math.round(num * 100) / 100).toFixed(2);
  }

  // Free memory delta (GB) after model size
  getFreeGB(sizeBytes) {
    if (this.freeMemoryMb == null) return null;
    const freeGb = this.freeMemoryMb / 1024;
    const modelGb = sizeBytes / 1024 / 1024 / 1024;
    return Number(freeGb - modelGb).toFixed(1);
  }

  getFreeGBClass(sizeBytes) {
    const delta = this.getFreeGB(sizeBytes);
    if (delta == null) return "";
    return Number(delta) > 0 ? "pico-color-green-650" : "pico-color-red-650";
  }

  /* ---------------- Actions ---------------- */

  async downloadModel(modelName) {
    this.setBusy(true);

    // Reset progress
    this.downloadingProgressValue = 0;
    this.downloadingProgressStatus = `${modelName}: starting…`;
    this.downloadingProgressStatusProgress = "";

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
        if (err?.name === 'AbortError') {
          console.warn('Stream read aborted');
          return;
        }
        throw err;
      }

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      try {
        const r = JSON.parse(chunk);

        if (r?.total && r?.completed) {
          const completed = Number(this.roundTo2Decimals(r.completed / 1024 / 1024));
          const total = Number(this.roundTo2Decimals(r.total / 1024 / 1024));
          const perc = total > 0 ? this.roundTo2Decimals((completed / total) * 100) : "100.00";

          this.downloadingProgressValue = total > 0 ? (completed / total) : 1;
          this.downloadingProgressStatus = `${modelName}: ${r.status || ""}`;
          this.downloadingProgressStatusProgress = `${completed.toFixed(2)} MB / ${total.toFixed(2)} MB (${perc}%)`;
        } else if (r?.status) {
          this.downloadingProgressStatus = `${modelName}: ${r.status}`;
        }
      } catch {
        // Ignore partial / non-JSON chunks
      }
    }

    this.ollamamodels = await OllamaApi.getOllamaModels();
    this.setBusy(false);
    this.finish();
  }

  async deleteModel(modelName) {
    this.setBusy(true);

    const response = await fetch(OllamaApi.getEndpointByOperation('delete'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (response.ok) {
      this.ollamamodels = await OllamaApi.getOllamaModels();
    } else {
      const error = await response.text().catch(() => "");
      console.error(`❌ Failed to delete model: ${error}`);
    }

    this.setBusy(false);
  }

  /* ---------------- Render ---------------- */

  renderActionButton(model) {
    const installed = (OllamaApi.models || []).some(current => current.name === model.name);

    if (!installed) {
      return html`
        <button
          class="btn-mini pico-background-green-650"
          @click=${() => this.downloadModel(model.name)}
          ?disabled=${this.busy}>
          ${this.text.download}
        </button>
      `;
    }

    return html`
      <button
        class="btn-mini pico-background-red-650"
        @click=${() => this.deleteModel(model.name)}
        ?disabled=${this.busy}>
        ${this.text.delete}
      </button>
    `;
  }

  render() {
    const models = this.getModels();

    return html`
      <dialog open>
        <article>
          <header>
            <div class="grid">
              <div>
                <h1>${this.text.title}</h1>
                ${this.renderFreeMemoryLine()}
              </div>

              ${(!this.ollamamodels.length || this.busy)
                ? html``
                : html`
                    <div align="right">
                      <button class="outline contrast" @click=${() => this.finish()}>
                        ${this.text.close}
                      </button>
                    </div>
                  `}
            </div>
          </header>

          ${this.busy ? html`
            <progress value="${this.downloadingProgressValue}" max="1"></progress>
            <div class="grid">
              <span aria-busy="true">${this.downloadingProgressStatus}</span>
              <span id="status-progress">${this.downloadingProgressStatusProgress}</span>
            </div>
            <br/>
            <button class="outline" @click=${() => this.cancelDownload()}>
              ${this.text.cancel}
            </button>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Size</th>
                <th scope="col">Delta</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              ${this.freeMemoryMb != null
                ? models.map((model) => {
                    const sizeGb = this.roundTo2Decimals(model.size / 1024 / 1024 / 1024);
                    const deltaGb = this.getFreeGB(model.size);
                    const deltaClass = this.getFreeGBClass(model.size);

                    return html`
                      <tr>
                        <th scope="row">
                          <small>
                            <a
                              target="_blank"
                              rel="noopener noreferrer"
                              href="https://ollama.com/library/${model.name}">
                              ${model.name}
                            </a>
                          </small>
                        </th>

                        <td><small>${sizeGb}GB</small></td>

                        <td>
                          <small>
                            ${deltaGb == null
                              ? html`<span class="delta">—</span>`
                              : html`<span class="delta ${deltaClass}">${deltaGb}GB</span>`
                            }
                          </small>
                        </td>

                        <td class="actions">
                          <small>${this.renderActionButton(model)}</small>
                        </td>
                      </tr>
                    `;
                  })
                : html``
              }
            </tbody>
          </table>
        </article>
      </dialog>
    `;
  }
}

// ✅ Apply context consumption ONCE (no manual consumer creation needed)
consume({ context: ollamamodelsContext })(QueryModelsDownload.prototype, 'ollamamodels');
customElements.define('md-query-models-download', QueryModelsDownload);
