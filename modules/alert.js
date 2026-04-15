import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { MessageBox } from './node_modules/@lit-component/message-box/message-box.js'
import { picocss } from './style.js';
export class Alert extends LitElement {
  static styles = [picocss,css``];
  static properties = {
    alert: {type: Object}
  };
  render() {
    return html`
      <message-box class="colorful" >
        <span slot="message">
          This is an example that contains only one option.
        </span>
        <button slot="button">Okay</button>
      </message-box>
    `;
  }
}
customElements.define('md-alert', Alert);
