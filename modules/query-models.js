import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './query-models-download.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { ollamamodelsContext } from './context.js';
import OllamaApi from './api.js';
import { picocss } from './style.js';
import { store } from './store.js';
export class QueryModels extends LitElement {

  static styles = [picocss, css`
    #ollamamodel {
    }
    .grid {
      min-width: 25rem;
    }
  `];

  static properties = {
    ollamamodels: {type: Object}
  };

  hasModel() {
    return this.ollamamodels.length;
  }

  constructor() {
    super();
    this.textSelectModel = 'Please select LLM';
    this.text = "Models"
    this.showDownloadModel = false
  }

  toggleDownloadModel(){
    this.showDownloadModel = !this.showDownloadModel;
    this.requestUpdate();
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

  onContextUpdate = (e) => {
    console.log('Received context update manually:', e.detail.value);
    this.ollamamodels = e.detail.value;
    this.requestUpdate();
    // Updated via downloads
    setTimeout((() => {
      store.setModel(this.getSelectedModel());
      this.preloadModel()
    }).bind(this), 0);
  }

  getSelectedModel(){
    let selected = this.renderRoot.getElementById('ollamamodel');
    return selected.value;
  }

  getDownloadComponent() {
    return html `
      <div
        id="md-query-models-download"
        type="submit"
        @click=${(()=>{
          this.showDownloadModel = true
          this.requestUpdate()
        }).bind(this)}
        class="outline">
          ${this.text}
        </div>
    `
  }

  async unloadLoadModel(model){
      const response = await fetch(OllamaApi.getEndpointByOperation("generate"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: '',
          keep_alive: 0
        })
      });
  }

  async unloadLoadModels() {
    const response = await fetch(OllamaApi.getEndpointByOperation("ps"), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (!data.models || data.models.length === 0) {
      console.log("No models loaded");
      return;
    }

    // Extract names and unload each
    for (const model of data.models) {
      console.log("Unloading:", model.name);
      await this.unloadLoadModel(model.name);
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

        // Check if model is present
        if (data.models && data.models.some(m => m.name === model)) {
          console.log(`Model "${model}" is now loaded.`);
          return true;
        }

        // Check timeout
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= timeoutSeconds) {
          console.warn(`Timeout waiting for model "${model}".`);
          return false;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs));

      } catch (error) {
        console.error("Error while checking model status:", error);
        return false;
      }
    }
  }

  async preloadModel(msg) {

    const model = this.getSelectedModel()

    if (model=="no_model") {
      console.log(`Model ${model} nop.`);
      return
    }

    store.setLoading(msg ? msg : `Model ${model} preload started.`)
    console.log(`Model ${model} preload started.`);

    await this.unloadLoadModels()

    try {
      await OllamaApi.loadModelFromSystem(model)
      // let response = await fetch(OllamaApi.getEndpointByOperation("chat"), {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     model: model,
      //     keep_alive: -1
      //   })
      // });

      // if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // let reader = response.body.getReader();
      // while (true) {
      //   let { done, value } = await reader.read();
      //   if (done) break;
      // }

      // response = await fetch(OllamaApi.getEndpointByOperation("generate"), {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     model: model,
      //     keep_alive: -1,
      //     prompt: ''
      //   })
      // });

      // if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // reader = response.body.getReader();
      // while (true) {
      //   let { done, value } = await reader.read();
      //   if (done) break;
      // }

      console.log(`Model ${model} preloaded successfully.`);

    } catch (err) {
      console.error('Error:', err);
    }

    const isLoaded = await this.waitForModelLoad(model);
    if (isLoaded) {
    } else {
      console.log("Model failed to load in time");
    }
    store.setLoading(false)

  }

  onChange() {
    this.preloadModel()
    store.setModel(this.getSelectedModel());
  }

  firstUpdated() {
    this.preloadModel()
    store.setModel(this.getSelectedModel());
  }

  updated() {
    if (store.stopped) {
      console.log("Will hard stop model", store.stopped)
      this.preloadModel("Stopping response stream")
      store.setStopped(false)
    }
  }

  renderModelList() {
    return html `
      <select
          class="outline"
          id="ollamamodel"
          aria-label="${this.textSelectModel}"
          @change=${this.onChange}
          required>
          ${
          this.hasModel() &&  !this.showDownloadModel ?
            this.ollamamodels.sort().map((model, index) => html`
              <option ${index==0?"selected":""} value="${model}">${model}</option>
            `)
          :
          html `<option value="no_model">No model found</option>`
        }
      </select>
    `
  }

  render() {
    return html`
      <fieldset role="group">
      ${
        this.showDownloadModel ?
          html `
          <md-query-models-download
            .callback=${this.toggleDownloadModel.bind(this)}>
          </md-query-models-download>`
        :
          html`
            ${this.renderModelList()}
            ${this.getDownloadComponent()}
          `
      }
      </fieldset>
    `;
  }
}
consume({ context: ollamamodelsContext })(QueryModels.prototype, 'ollamamodels');
customElements.define('md-query-models', QueryModels);
