import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import { picocss, picocsscolors } from './style.js';
import { marked } from '../static/marked.esm.js'
export class Search extends LitElement {

  static styles = [picocss, picocsscolors,  css`
    .search-container {
      font-size: 1.2rem;
      padding-bottom: 1rem;
    }
    .search-header-container{
      display: inline-block;
      width: 100%;
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
      float: left;
    }
    .search-response-loading {
      border-radius: 1rem;
      padding-bottom: 1rem;
      float: left;
      width: 100%;
    }
  `];

  static properties = {
    msg: {type: Object},
    loading: { type: Boolean },
    worker: { type: Object},
    speak: { type: Object},
  };

  constructor() {
    super();
    this.loading = true;
    this.processedQ = [];
    this.speachTokenQueue = [];
    this.speachStringQueue = [];
    this.isSpeaking = false;

    this.elements = []
    this.printingCode = false
    this.writer = false
    this.previousToken = ''

    this.audioCtx = false
  }

  firstUpdated() {
    let containerEl = this.renderRoot.getElementById("search-query")
    let q = this.msg.query.replace(/\n/g, "<br>")
    containerEl.innerHTML = q

    if(this.worker)
      this.worker.onmessage = ((e) => {
        const audio = e.data.audio;
        const sampleRate = e.data.sampleRate;
        const speachStrTokens = e.data.speachStrTokens;
        const final = e.data.final;
        if (!this.audioCtx)
            this.audioCtx = new AudioContext({sampleRate : sampleRate});
        const buffer = this.audioCtx.createBuffer(1, audio.samples.length, sampleRate);
        const ptr = buffer.getChannelData(0);
        for (let i = 0; i < audio.samples.length; i++) {
          ptr[i] = audio.samples[i];
        }
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioCtx.destination);
        this.processedQ.push({
          audioNode: source,
          speachTokenQueue: speachStrTokens,
          final
        });
        this.processSpeach();
      }).bind(this);
  }

  enqueueSpeech(token, final=false) {
    let p1Stage = token.replace(/<[^>]*>?/gm, '');
    let p2Stage = p1Stage.replace(/[*,#]/g, '');
    this.speachStringQueue.push(p2Stage);
    this.speachTokenQueue.push(token);
    // console.log(JSON.stringify(token))
    if (/[\n]/.test(token)) {
      let speachStr = this.speachStringQueue.splice(0, this.speachStringQueue.length).join('')
      let speachStrTokens = this.speachTokenQueue.splice(0, this.speachTokenQueue.length)
      this.worker.postMessage({ speachStr, speachStrTokens, final });
    }
  }

  async processSpeach() {
    if (this.isSpeaking) {
      return;
    }
    this.isSpeaking = true;
    const qelement = this.processedQ.shift()

    if (!qelement) {
      this.isSpeaking = false;
      return;
    }

    qelement.audioNode.onended = (() => {
      this.isSpeaking = false;
      this.processSpeach(); // Move to next in queue
      if (qelement.final) {
        this.finalCB()
      }

    }).bind(this);
    await this.printWithDelay.call(this, qelement.speachTokenQueue);
    qelement.audioNode.start();
  }

  async printWithDelay(printTextTokens) {
    for (const element of printTextTokens) {
      this.printText(element);
      await new Promise(resolve => setTimeout(resolve, 10)); // sleep 500ms
    }
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
      if (this.speak) {
        this.enqueueSpeech(token)
      } else {
        this.printText(token)
      }
    }
  }

  createWriter() {
    let writer = {
      el: document.createElement('div'),
      text: "",
      type: this.printingCode ? 'code' : 'text',
    }
    this.elements.push(writer)
    let containerEl = this.renderRoot.getElementById("search-response")
    containerEl.appendChild(writer.el);
    return writer
  }

  isCode(token,previousToken){
    if (previousToken.trim() == '```') {
      return false;
    }
    if (token.trim() == '```' || previousToken.trim() + token.trim() == '```') {
      return true
    }
  }

  getLastWriter(){
    return this.elements[this.elements.length - 1];
  }

  printText(token) {

    let previousToken = this.previousToken
    this.previousToken = token

    if (!this.elements.length){
      this.writer = this.createWriter()
    } else if (this.isCode(token, previousToken) && !this.printingCode) {
      this.printingCode = true
      this.writer = this.createWriter()
    } else if (this.isCode(token, previousToken) && this.printingCode) {
      this.printingCode = false
      this.writer = this.getLastWriter()
      this.createWriter()
    } else {
      this.writer = this.getLastWriter()
    }

    this.msg.response += token;
    this.writer.text += token;
    let aBottom = this.isAtBottom()

    switch (this.writer.type) {
      case 'code':
        this.writer.el.innerHTML = marked.parse(this.writer.text)
        Prism.highlightAllUnder(this.writer.el)
        break;
      default:
        this.writer.el.innerHTML = marked.parse(this.writer.text)
        break;
    }

    if (aBottom) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    }
  }

  end(cb) {
    let aBottom = this.isAtBottom()
    if (aBottom) {
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 0);
    }
    this.finalCB = () => {
      cb()
      this.loading = false;
    }
    if (this.speak) {
      this.enqueueSpeech("\n", true)
    } else {
      this.finalCB()
    }
  }

  cancel(cb) {
    try {
      if (this.audioCtx.state !== 'closed') {
        if (this.audioCtx.close)
          this.audioCtx.close().catch(console.error);
      }
    } catch (error) {
      console.log(error)
    }
    if(this.worker)
      this.worker.onmessage = () => {}
    this.loading = false;
    this.processedQ = [];
    cb()
  }

  render() {
    return html`
      <link rel="stylesheet" href="./css/prism.css">
      <div class="search-container">
        <div class="search-header-container">
          <div id="search-query" class="pico-background-sand-50"></div>
        </div>
        <div id="search-response">
        </div>
        ${!this.loading ? html`
          <div>
            <small>
              ${this.msg.model}
            </small>
          </div>` :
          html `<p class="search-response-loading" aria-busy="true">&nbsp;</p>`}
      </div>
    `;
  }
}
customElements.define('md-search', Search);
