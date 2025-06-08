import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './query-models-download.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { ollamamodelsContext } from './context.js';
export class QueryModels extends LitElement {

  static styles = css`
    #ollamamodel {
      width: 19vw;
      float: right;
    }
    #md-query-models-download {
      width: 10vw;
      float: right;
      margin-left: 0.25rem;
    }
    #md-query-models-download-img{
      height: 20px;
    }
  `;

  static properties = {
    ollamamodels: {type: Object}
  };

  hasModel() {
    return this.ollamamodels.length;
  }

  constructor() {
    super();
    this.textSelectModel = 'Please select LLM';
    this.showDownloadModel = false
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
          <img id="md-query-models-download-img" src="./css/gear.png">
        </div>
    `
  }

  renderModelList() {
    return html `
      <select
          id="ollamamodel"
          aria-label="${this.textSelectModel}"
          required>
          ${
          this.hasModel() &&  !this.showDownloadModel ?
            this.ollamamodels.map((model, index) => html`
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
