import { LitElement, html, css } from '/static/lit-core.min.js'

export class Search extends LitElement {

  static styles = css`
    #chatBoxResponse {
      font-size:0.5em !important;
    }
  `;

  writeResponse(msg) {
    var converter = new showdown.Converter();
    var msg = converter.makeHtml(msg);
    this.renderRoot.getElementById('chatBoxResponse').innerHTML = msg
  }

  render() {
    return html`
      <link rel="stylesheet" href="static/pico.min.css">
      <div id="chatBoxResponse"></div>
    `;
  }
}
customElements.define('md-search', Search);
