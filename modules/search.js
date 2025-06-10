import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'

export class Search extends LitElement {

  static styles = css`
    .search-container {
      font-size: 1rem;
      padding-bottom: 1rem;
    }
    .search-header-container{
      width: 60vw;
      display: inline-block;
    }
    #search-query {
      border-radius: 0.5rem;
      padding: 0.5rem;
      display: inline;
      float: right;
    }
    #search-response {
      border-radius: 1rem;
      padding-top: 1rem;
      width: 60vw;
      float: left;
    }
    .search-response-loading {
      border-radius: 1rem;
      padding-bottom: 1rem;
      width: 60vw;
      float: left;
    }
  `;

  static properties = {
    msg: {type: Object},
    loading: { type: Boolean }
  };

  constructor() {
    super();
    this.loading = true;
  }

  isAtBottom() {
    let scrollTop = window.scrollY || document.documentElement.scrollTop;
    let windowHeight = window.innerHeight;
    let docHeight = document.documentElement.scrollHeight;
    let atBottom = scrollTop + windowHeight >= docHeight - 10;
    return atBottom;
  }

  write(token) {
    if (token) {
      let aBottom = this.isAtBottom()
      var converter = new showdown.Converter();
      this.msg.response += token;
      let el =  this.renderRoot.getElementById("search-response")
      el.innerHTML = converter.makeHtml(this.msg.response)
      Prism.highlightAllUnder(el)
      if (aBottom) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      }
    }
  }

  end() {
    let aBottom = this.isAtBottom()
    this.loading = false;
    if (aBottom) {
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 0);
    }
  }

  render() {
    return html`
    <link href="./static/prism.css" rel="stylesheet" />
    <script src="./static/prism.js" data-manual></script>
      <link rel="stylesheet" href="css/pico.min.css">
      <link rel="stylesheet" href="css/pico.colors.min.css">
      <div class="search-container">
        <div class="search-header-container">
          <div id="search-query" class="pico-background-sand-50">${this.msg.query}</div>
        </div>
        <div id="search-response">
         <p class=".search-response-loading" aria-busy="true">&nbsp;</p>
        </div>
        ${!this.loading ? html`
          <small>
            ${this.msg.model}
          </small>` : ''}
      </div>
    `;
  }
}
customElements.define('md-search', Search);
