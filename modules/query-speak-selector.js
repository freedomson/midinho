import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { picocss } from './style.js';
import { store } from './store.js';
export class Header extends LitElement {

  static styles = [picocss,css`
    .md-speak-selector {
      width: 9rem;
    }
`];

  constructor() {
    super();
    this.speakers = [
      {
        value: "",
        name: "Only text"
      },
      {
        value: "pt_PT",
        name: "Portuguese"
      },
      {
        value: "en_US",
        name: "American"
      }
    ]
  }

  getSelectedWorker(){
    let selected = this.renderRoot.getElementById('md-speak-selector');
    return selected.value;
  }

  onChange(){
    let speaker = this.getSelectedWorker()
    switch (speaker) {
      case "":
        store.setSpeakerWorker(false);
        store.setSpeak(false);
        break;
      default:
        let worker = new Worker(`/modules/tts/audioWorker_${speaker}.js`);
        store.setSpeakerWorker(worker);
        store.setSpeak(true);
        break;
    }
  }

  renderSpeakerList() {
    return html `
      <select
          id="md-speak-selector"
          class="md-speak-selector"
          @change=${this.onChange}
          required>
          ${
            this.speakers.sort().map((speaker, index) => html`
              <option ${index==0?"selected":""} value="${speaker.value}">${speaker.name}</option>
            `)
        }
      </select>
    `
  }

  render() {
    return html`
      ${ this.renderSpeakerList() }
    `;
  }
}
customElements.define('md-speak-selector', Header);
