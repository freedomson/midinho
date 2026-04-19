import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import OllamaApi from './api.js';
import { ollamamodelsContext } from './context.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss, picocsscolor } from './style.js';
import { store } from './store.js';

export class QueryModelsDownload extends LitElement {
  static styles = [
    picocss,
    picocsscolor,
    css`
    .download {
      text-align: center;
    }
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

    this.busy = false;
    this.callback = null;
    this.ollamamodels = [];

    this.abortController = new AbortController();

    this.downloadingProgressValue = 0;
    this.downloadingProgressStatus = "";
    this.downloadingProgressStatusProgress = "";

    // Memory defaults
    this.freeMemoryMb = null;
    this.memoryError = "";
    this.memoryEndpoint = "http://localhost:8081/free-memory";
    this.memoryIntervalMs = 1000;

    // Internal polling control
    this._memTimer = null;
    this._memAbort = null;
    this._memInFlight = false;

    // Model catalog
    this.defaultModels = [
      { name: "smollm2:135m",      size: 0.271 * 1024 * 1024 * 1024, context: "8K",   input: ["text"]},
      { name: "gemma3:4b",         size: 3.3   * 1024 * 1024 * 1024, context: "128K", input: ["text", "image"], ep: true },
      { name: "gemma3:12b",        size: 8.1   * 1024 * 1024 * 1024, context: "128K", input: ["text", "image"] },
      { name: "gemma4:e4b",        size: 9.6   * 1024 * 1024 * 1024, context: "128K", input: ["text", "image"] },
      { name: "medgemma:4b",       size: 3.3   * 1024 * 1024 * 1024, context: "128K", input: ["text", "image"] },
      { name: "translategemma:4b", size: 3.3   * 1024 * 1024 * 1024, context: "128K", input: ["text", "image"] },
      { name: "llama3.1:8b",       size: 4.9   * 1024 * 1024 * 1024, context: "128K", input: ["text"] },
      { name: "llama3.2:3b",       size: 2.0   * 1024 * 1024 * 1024, context: "128K", input: ["text"] },
      { name: "deepseek-r1:14b",   size: 9.0   * 1024 * 1024 * 1024, context: "128K", input: ["text"] },
      { name: "deepseek-r1:8b",    size: 5.2   * 1024 * 1024 * 1024, context: "128K", input: ["text"] },
      { name: "deepseek-r1:1.5b",  size: 1.1   * 1024 * 1024 * 1024, context: "128K", input: ["text"] },
      { name: "qwen3:8b",          size: 5.2   * 1024 * 1024 * 1024, context: "40K",  input: ["text"] },
      { name: "mistral:7b",        size: 4.4   * 1024 * 1024 * 1024, context: "40K",  input: ["text"] }
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this);          // ✅ i18n updates on lang change
    this._startMemoryPolling();
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    this._stopMemoryPolling();
    this._abortMemoryFetch();
    super.disconnectedCallback();
  }

  /* ---------------- Memory Polling ---------------- */

  _startMemoryPolling() {
    if (this._memTimer) return;

    this._fetchFreeMemory(); // immediate
    this._memTimer = setInterval(() => this._fetchFreeMemory(), this.memoryIntervalMs);
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
    if (this._memInFlight) return;
    this._memInFlight = true;

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
        if (this.freeMemoryMb !== mb || this.memoryError) {
          this.freeMemoryMb = mb;
          this.memoryError = "";
        }
      } else {
        this._setMemoryState(null, "invalid payload");
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        this._setMemoryState(null, "fetch failed");
      }
    } finally {
      this._memInFlight = false;
    }
  }

  _setMemoryState(mbOrNull, errMsg) {
    const changed = this.freeMemoryMb !== mbOrNull || this.memoryError !== errMsg;
    if (changed) {
      this.freeMemoryMb = mbOrNull;
      this.memoryError = errMsg || "";
    }
  }

  renderFreeMemoryLine() {
    const label = store.t("queryModelsDownload.freeMemory");

    if (this.memoryError) {
      return html`
        <div class="memline">
          ${label}: <span class="memerr">${this.memoryError}</span>
        </div>
      `;
    }
    if (this.freeMemoryMb === null) {
      return html`
        <div class="memline">
          ${label}: <em>${store.t("queryModelsDownload.loading")}</em>
        </div>
      `;
    }
    return html`
      <div class="memline">
        ${label}: <strong>${this.freeMemoryMb}</strong> MB
      </div>
    `;
  }

  /* ---------------- Model List / Merge ---------------- */

  mergeArray(arr1, arr2) {
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
    // If you want to pause polling when busy:
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

  getFreeGB(sizeBytes) {
    if (this.freeMemoryMb == null) return null;
    const freeGb = this.freeMemoryMb / 1024;
    const modelGb = sizeBytes / 1024 / 1024 / 1024;
    return Number(freeGb - modelGb).toFixed(1);
  }

  getFreeGBClass(sizeBytes, background = false) {
    const delta = this.getFreeGB(sizeBytes);
    let bck = background ? 'background' : 'color'
    if (delta == null) return "";
    return Number(delta) > 0 ? `pico-${bck}-green-650` : `pico-${bck}-yellow-650`;
  }

  /* ---------------- Actions ---------------- */

  async downloadModel(modelName) {
    this.setBusy(true);

    this.downloadingProgressValue = 0;
    this.downloadingProgressStatus = `${modelName}: ${store.t("queryModelsDownload.starting")}`;
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
        // ignore
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
          class="btn-mini pico-background-green-650 ${this.getFreeGBClass(model.size, true)}"
          @click=${() => this.downloadModel(model.name)}
          ?disabled=${this.busy}>
          ${store.t("queryModelsDownload.download")}
        </button>
      `;
    }

    return html`
      <button
        class="btn-mini pico-background-red-650"
        @click=${() => this.deleteModel(model.name)}
        ?disabled=${this.busy}>
        ${store.t("queryModelsDownload.delete")}
      </button>
    `;
  }

  render() {
    const models = this.getModels();

    return html`
      <dialog open>
        <article>
          <header>
            <div class="container download">
              <h1>${store.t("queryModelsDownload.title")}</h1>
              ${this.renderFreeMemoryLine()}
            </div>
          </header>

          <div class="container download">

          ${(!this.ollamamodels.length || this.busy)
            ? html``
            : html`
                <div class="container">
                  <button
                    @click=${() => this.finish()}>
                    ${store.t("queryModelsDownload.close")}
                  </button>
                </div>
                <br />
              `}

          ${this.busy ? html`

            <progress value="${this.downloadingProgressValue}" max="1"></progress>
            <br />
            <div class="container">
              <span aria-busy="true">${this.downloadingProgressStatus}</span>
            </div>
            <div class="container">
              <span id="status-progress">${this.downloadingProgressStatusProgress}</span>
            </div>
            <br />
            <div class="container">
              <button @click=${() => this.cancelDownload()}>
                ${store.t("queryModelsDownload.cancel")}
              </button>
            </div>
            <br />
          ` : ''}
          <div>

          <table class="striped">
            <thead>
              <tr>
                <th scope="col">${store.t("queryModelsDownload.model")}</th>
                <th scope="col">${store.t("queryModelsDownload.size")}</th>
                <th scope="col">${store.t("queryModelsDownload.action")}</th>
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
                            ${model.ep ?
                              html`<mark>${store.t("queryModelsDownload.editorPick")}</mark>`
                              :``}
                          </small>
                        </th>

                        <td>
                          <small>${sizeGb}GB
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

consume({ context: ollamamodelsContext })(QueryModelsDownload.prototype, 'ollamamodels');
customElements.define('md-query-models-download', QueryModelsDownload);
