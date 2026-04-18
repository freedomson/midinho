import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import './search.js';
import './query-text.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';
import { store } from './store.js';
import { OllamaChat } from './ollama-chat.js';

export class Query extends LitElement {

  static styles = [picocss, css`
    hr {
      padding: 0;
      margin: 0;
    }
    .md-query-welcome {
      text-align: center;
      display: block;
      margin-bottom: 1rem;
    }
    #query-response {
      float: left;
      width: 100%;
    }
  `];

  static properties = {
    textarea: { type: Object },
    msgs: { type: Array },
    loading: { type: Boolean }
  };

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this);
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    super.disconnectedCallback();
  }

  constructor() {
    super();
    this.messageWelcome = 'What can I help with?';
    this.msgs = [];
    this.msgsRefs = [];
    this.loading = false;

    // ✅ Browser-native Ollama client
    this.ollama = new OllamaChat({
      baseUrl: 'http://localhost:11434',
      debug: true
    });
  }

  firstUpdated() {
    this.mdQueryText = this.shadowRoot.querySelector('md-query-text');
  }

  isLoading() {
    return this.loading;
  }

  setLoading(value) {
    this.loading = value;
  }

  async submitQuery(query) {
    this.setLoading(true);

    const selectedModel = store.model;

    const msg = {
      id: this.msgs.length,
      query,
      model: selectedModel,
      response: ""
    };

    this.msgs = [...this.msgs, msg];
    await this.requestUpdate();

    const msgEl = this.renderRoot.getElementById(
      `md-search-${this.msgs.length}`
    );

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    }, 0);

    this.mdQueryText.disable?.();

    this.ollama.run({
      lang: store.lang,
      query,
      model: selectedModel,

      onToken: (token) => {
        msgEl.write(token);
      },

      onDone: () => {
        msgEl.end(() => {
          this.setLoading(false);
          this.mdQueryText.enable();
        });
      },

      onCancel: () => {
        msgEl.cancel(() => {
          this.setLoading(false);
          this.mdQueryText.enable();
        });
      },

      onError: (e) => {
        this.errorCallBack(e);
      }
    });
  }


  clearCallBack() {
    this.ollama.abort();
    this.ollama.clearHistory();

    this.msgs = [];
    this.loading = false;
    this.mdQueryText?.enable();

    this.requestUpdate();
    console.log("clearCallBack")
  }

  cancelCallBack(e) {
    // ✅ Abort network request
    this.ollama.abort();

    const msgEl = this.renderRoot.getElementById(
      `md-search-${this.msgs.length}`
    );

    msgEl.cancel(() => {
      this.setLoading(false);
      this.mdQueryText.enable();
      if (e) {
        this.mdQueryText.setErrorMsg(e);
      }
    });
  }

  errorCallBack(e) {
    console.error('LLM error:', e);
    this.setLoading(false);
    this.cancelCallBack(e);
  }

  render() {
    const label = store.t("query.welcome");
    return html`
      <p class="md-query-welcome">
        ${label}
      </p>

      <div id="query-response">
        ${this.msgs.map((msg, index) => html`
          <md-search
            id="md-search-${index + 1}"
            .speak=${store.speak}
            .worker=${store.speakerWorker}
            .msg=${msg}>
          </md-search>
        `)}
      </div>

      <md-query-text
        .clearCallBack=${this.clearCallBack.bind(this)}
        .cancelCallBack=${this.cancelCallBack.bind(this)}
        .isLoading=${this.isLoading.bind(this)}
        .submitQuery=${this.submitQuery.bind(this)}>
      </md-query-text>
    `;
  }
}

customElements.define('md-query', Query);
