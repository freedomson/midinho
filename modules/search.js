import { LitElement, html } from '/static/lit-core.min.js'

export class Search extends LitElement {

  writeResponse(msg, query) {
    var converter = new showdown.Converter();
    var html = converter.makeHtml(msg);
    this.renderRoot.getElementById('chatBoxQuery').innerHTML = query
    this.renderRoot.getElementById('chatBoxResponse').innerHTML = html
  }

  render() {
    return html`
      <link rel="stylesheet" href="static/pico.min.css">
      <article id="chatBoxQuery">What can I help with?</article>
      <article id="chatBoxResponse"></article>
    `;
  }
}
customElements.define('md-search', Search);
