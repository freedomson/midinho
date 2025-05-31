import { LitElement, html, css } from '/static/lit-core.min.js'

export class Search extends LitElement {

  static styles = css`
    #chatBoxResponse {
      font-size:0.5em !important;
      margin-bottom: 190px;
    }
  `;

  static properties = {
    msg: {type: Object}
  };

  constructor() {
    super();
    this.msg = ""
  }

  write(token) {
    if (token) {
      let scrollTop = window.scrollY || document.documentElement.scrollTop;
      let windowHeight = window.innerHeight;
      let docHeight = document.documentElement.scrollHeight;
      let atBottom = scrollTop + windowHeight >= docHeight;
      if (atBottom) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      }
      var converter = new showdown.Converter();
      this.msg += token;
      this.renderRoot.getElementById('chatBoxResponse').innerHTML = converter.makeHtml(this.msg)
    }
  }

  render() {
    return html`
      <link rel="stylesheet" href="static/pico.min.css">
      <div id="chatBoxResponse"></div>
    `;
  }
}
customElements.define('md-search', Search);
