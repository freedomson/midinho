import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import './query-models-download.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { ollamamodelsContext } from './context.js';
import OllamaApi from './api.js';
import { picocss } from './style.js';
import { store } from './store.js';

export class QueryModels extends LitElement {

  static styles = [picocss, css`
    .grid { min-width: 25rem; }
  `];

  static properties = {
    ollamamodels: { type: Object },

    // ✅ IMPORTANT: make it reactive so UI re-renders
    showDownloadModel: { type: Boolean }
  };

  constructor() {
    super();
    this.showDownloadModel = false;
    this.ollamamodels = [];
  }

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this);
    this.addEventListener('context-updated-manual', this.onContextUpdate);
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    this.removeEventListener('context-updated-manual', this.onContextUpdate);
    super.disconnectedCallback();
  }

  hasModel() {
    return Array.isArray(this.ollamamodels) && this.ollamamodels.length > 0;
  }

  toggleDownloadModel() {
    this.showDownloadModel = !this.showDownloadModel; // ✅ reactive now
  }

  onContextUpdate = (e) => {
    this.ollamamodels = e.detail.value;

    // Updated via downloads
    queueMicrotask(() => {
      store.setModel(this.getSelectedModel());
      this.preloadModel();
    });
  };

  getSelectedModel() {
    const selected = this.renderRoot?.getElementById('ollamamodel');
    return selected?.value;
  }

  getDownloadComponent() {
    return html`
      <div type="submit" @click=${() => this.showDownloadModel = true}>
        ${store.t("queryModels.models")}
      </div>
    `;
  }

  async unloadLoadModel(model) {
    await fetch(OllamaApi.getEndpointByOperation("generate"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: '', keep_alive: 0 })
    });
  }

  async unloadLoadModels() {
    let loaded;
    try {
      loaded = await OllamaApi.getLoadedModels();
    } catch (e) {
      console.error("Error fetching loaded models:", e);
      return;
    }

    if (!loaded.length) return;

    for (const name of loaded) {
      await this.unloadLoadModel(name);
    }
  }

  async waitForModelLoad(model, timeoutSeconds = 30, intervalMs = 1000) {
    const startTime = Date.now();

    while (true) {
      try {
        const response = await fetch(OllamaApi.getEndpointByOperation("ps"), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.models && data.models.some(m => m.name === model)) {
          return true;
        }

        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= timeoutSeconds) return false;

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error("Error while checking model status:", error);
        return false;
      }
    }
  }

  async preloadModel() {
    const model = this.getSelectedModel();

    if (!model || model === "no_model") return;

    // store.setLoading(store.t("queryModels.preloadStarted", { model }));
    store.setLoading(true);

    try {
      const alreadyLoaded = await OllamaApi.isModelLoaded(model);
      if (alreadyLoaded) return;

      await this.unloadLoadModels();
      await OllamaApi.loadModelFromSystem(model);
      await this.waitForModelLoad(model);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      store.setLoading(false);
    }
  }

  onChange() {
    this.preloadModel();
    store.setModel(this.getSelectedModel());
  }

  firstUpdated() {
    this.preloadModel();
    store.setModel(this.getSelectedModel());
  }

  updated() {
    if (store.stopped) store.setStopped(false);
  }

  renderModelList() {
    return html`
      <select
        id="ollamamodel"
        aria-label="${store.t("queryModels.selectModel")}"
        @change=${() => this.onChange()}
        required>
        ${this.hasModel() && !this.showDownloadModel
          ? this.ollamamodels.sort().map((model, index) => html`
              <option value="${model}" ?selected=${index === 0}>${model}</option>
            `)
          : html`
              <option value="no_model">${store.t("queryModels.noModel")}</option>
            `}
      </select>
    `;
  }

  render() {
    return html`
      <div role="group">
        ${this.showDownloadModel
          ? html`
              <md-query-models-download
                .callback=${() => {
                  this.showDownloadModel = false;
                  queueMicrotask(() => {
                    store.setModel(this.getSelectedModel());
                    this.preloadModel();
                  });
                }}>
              </md-query-models-download>
            `
          : html`
              ${this.renderModelList()}
              ${this.getDownloadComponent()}
            `}
      </div>
    `;
  }
}

consume({ context: ollamamodelsContext })(QueryModels.prototype, 'ollamamodels');
customElements.define('md-query-models', QueryModels);
