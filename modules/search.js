import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'

export class Search extends LitElement {

  static styles = css`
    #search-container {
    }
    #search-query {
      font-size: 0.7rem !important;
      border-radius: 1rem;
      padding: 1rem;
      display: inline;
      float: right;
    }
    #search-response {
      font-size: 0.7rem !important;
      border-radius: 1rem;
      padding: 1rem;
      width: 60vw;
      float: left;
    }
  `;

  static properties = {
    msg: {type: Object}
  };

  constructor() {
    super();
  }

  write(token) {
    let scrollTop = window.scrollY || document.documentElement.scrollTop;
    let windowHeight = window.innerHeight;
    let docHeight = document.documentElement.scrollHeight;
    let atBottom = scrollTop + windowHeight >= docHeight - 10;
    if (token) {
      var converter = new showdown.Converter();
      this.msg.response += token;
      this.renderRoot.getElementById("search-response").innerHTML = converter.makeHtml(this.msg.response)
      if (atBottom) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      }
    }
  }

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.min.css">
      <link rel="stylesheet" href="css/pico.colors.min.css">
      <div id="search-container">
        <div id="search-query" class="pico-background-grey-50">${this.msg.query}</div>
        <div id="search-response"></div>
      </div>
    `;
  }
}
customElements.define('md-search', Search);
