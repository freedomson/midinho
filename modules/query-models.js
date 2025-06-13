import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './query-models-download.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { ollamamodelsContext } from './context.js';
import OllamaApi from './api.js';
export class QueryModels extends LitElement {

  static styles = css`
    #ollamamodel {
      float: right;
      min-width: 3rem;
      max-width: 25vw;
    }
    #md-query-models-download {
      float: right;
      margin-left: 0.25rem;
    }
  `;

  static properties = {
    ollamamodels: {type: Object},
    preloadModelStatus: {type: Array}
  };

  hasModel() {
    return this.ollamamodels.length;
  }

  constructor() {
    super();
    this.textSelectModel = 'Please select LLM';
    this.text = "Models"
    this.showDownloadModel = false
    this.preloadModelStatus = []
  }

  toggleDownloadModel(){
    this.showDownloadModel = !this.showDownloadModel;
    this.requestUpdate();
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('context-updated-manual', this.onContextUpdate);
  }

  disconnectedCallback() {
    this.removeEventListener('context-updated-manual', this.onContextUpdate);
    super.disconnectedCallback();
  }

  onContextUpdate = (e) => {
    console.log('Received context update manually:', e.detail.value);
    this.ollamamodels = e.detail.value;
    this.requestUpdate();
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

  async preloadModel() {
    const model = this.getSelectedModel()
    const found = this.preloadModelStatus.includes(model);
    if (found) {
      console.log(`Model ${model} was already preloaded.`)
      return;
    } else {
      console.log(`Model ${model} will be preloaded.`)
      this.preloadModelStatus.push(model)
    }

    try {
      const response = await fetch(OllamaApi.getEndpointByOperation("generate"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: '',
          keep_alive: '10m'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // const chunk = decoder.decode(value);
        // result += chunk;
        // console.log(result)
      }

      console.log(`Model ${model} preloaded successfully.`);

    } catch (err) {
      console.error('Error:', err);
    }
  }

  onChange() {
    this.preloadModel()
  }

  firstUpdated() {
    this.preloadModel()
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
      <link rel="stylesheet" href="css/pico.sand.min.css">
      ${
        this.showDownloadModel ?
          html `
          <md-query-models-download
            .callback=${this.toggleDownloadModel.bind(this)}>
          </md-query-models-download>`
        :
          html`
            ${this.getDownloadComponent()}
            ${this.renderModelList()}
          `
      }
    `;
  }
}
consume({ context: ollamamodelsContext })(QueryModels.prototype, 'ollamamodels');
customElements.define('md-query-models', QueryModels);
