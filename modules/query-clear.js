import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';
export class QueryClear extends LitElement {

  static styles = [picocss, css`
    #md-query-clear-btn {
      float: left;
      margin-left: 0.5rem;
      margin-bottom: 0px;
      min-width: 3rem;
    }
  `];

  static properties = {
    disabled: {type: Boolean},
    clearCallBack: { type: Function},
  };

  constructor() {
    super();
    this.disabled = true
    this.text = 'Clear'
  }

  execute(){
    this.clearCallBack()
    this.setDisable(true)
  }

  setDisable(value){
    this.disabled = value
  }

  render() {
    return html`
      ${ this.disabled ?
        html `
          <div
            class="outline"
            id="md-query-clear-btn"
            @click=${this.execute.bind(this)}
            disabled
            type="submit">
            ${this.text}
          </div>
        `
        :
        html `
          <div
            class="outline"
            id="md-query-clear-btn"
            @click=${this.execute.bind(this)}
            type="submit">
            ${this.text}
          </div>
        `
      }
    `;
  }
}

customElements.define('md-query-clear', QueryClear);
