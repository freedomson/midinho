import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'

export class Error extends LitElement {

  static styles = css`
    #error-container {
      margin-top: 1rem;
      text-align: center;
      display: block;
    }
    #error-info {
      text-align: center;
      display: block;
    }
  `;
  static properties = {
    error: {type: Object}
  };

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.sand.min.css">

      <article id="error-container">
        <h2>Oops, something went wrong!</h2>
        ${this.error}
      </article>
      <small id="error-info">
        Private Ollama requires an Ollama instance running locally.
        </br></br>
        <a href="https://ollama.com">Ollama</a> is a tool/platform for running and managing llms locally.
        </br></br>
        <h3><a href="https://ollama.com/download">Please download Ollama and try again!</a></h3>
      </small>
    `;
  }
}
customElements.define('md-error', Error);
