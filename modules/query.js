import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import './search.js';
import './query-text.js';
import { consume } from './node_modules/@lit-labs/context/index.js';
import { picocss } from './style.js';
import { store } from './store.js';
import { OllamaChat } from './ollama-chat.js';
import OllamaApi from './api.js';

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
    this.model = store.model
    const msg = {
      id: this.msgs.length,
      query,
      model: this.model,
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
      model: this.model,

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
    store.setLoading(true);
    this.cancelCallBack(false, ()=>{
      this.ollama.clearHistory();
      this.msgs = [];
    })
  }

  async cancelCallBack(err, in_cb = false) {
    store.setLoading(true);
    // ✅ Abort network request
    let cb = in_cb
    this.ollama.abort();
    this.loading = false;
    await OllamaApi.stopModelFromSystem(store.model);
    await OllamaApi.loadModelFromSystem(store.model);
    const msgEl = this.renderRoot.getElementById(
      `md-search-${this.msgs.length}`
    );
    if (msgEl) {
      msgEl.cancel(() => {
        this.setLoading(false);
        if (cb){
          cb()
        }
        store.setLoading(false);
        if (err) {
          this.mdQueryText.setErrorMsg(err);
        }
      });
    } else {
      store.setLoading(false);
    }

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
