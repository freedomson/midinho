import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'

export class QueryModels extends LitElement {

  static styles = css`
    #ollamamodel {
      width: 29vw;
      float: right;
    }
  `;

  static properties = {
    ollamamodels: {type: Object}
  };

  constructor() {
    super();
    this.textSelectModel = 'Please select LLM';
  }

  getSelected(){
    let selected = this.renderRoot.getElementById('ollamamodel');
    return selected.value;
  }

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.sand.min.css">
      <select id="ollamamodel" aria-label="${this.textSelectModel}" required>
          ${this.ollamamodels.map((model, index) => html`
            <option ${index==0?"selected":""} value="${model}">${model}</option>
          `)}
      </select>
    `;
  }
}
customElements.define('md-query-models', QueryModels);
