import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
export class QueryStart extends LitElement {

  static styles = css`
    #md-query-start-btn {
      float: left;
      margin-left: 0.5rem;
      margin-bottom: 0px;
      min-width: 3rem;
    }
  `;

  static properties = {
    disabled: {type: Boolean},
  };

  constructor() {
    super();
    this.disabled = true
    this.text = 'Ask'
  }

  setDisable(value){
    this.disabled = value
  }

  process(){
    this.processQuery(true)
  }

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.sand.min.css">
      ${ this.disabled ?
        html `
          <div
            class="outline"
            id="md-query-start-btn"
            @click=${this.process}
            disabled
            type="submit">
            ${this.text}
          </div>
        `
        :
        html `
          <div
            class="outline"
            id="md-query-start-btn"
            @click=${this.process}
            type="submit">
            ${this.text}
          </div>
        `
      }
    `;
  }
}

customElements.define('md-query-start', QueryStart);
