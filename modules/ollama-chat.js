// ollama-chat.js

import { i18n, DEFAULT_LANG } from "./i18n.js";

export class OllamaChat {
  constructor({
    baseUrl = "http://localhost:11434",
    debug = false,
    keepAlive = -1,
    defaultLang = "en_US",
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.debug = debug;
    this.keepAlive = keepAlive;
    this.defaultLang = defaultLang;

    this.i18n = i18n;

    this.chatHistory = [];
    this._controller = null;
    this._aborted = false;
    this._current = null;
    this.onToken = ""
    this.lang = ""
  }

  /* -------------------------
   * Prompt selection (FULLY i18n DRIVEN)
   * ------------------------- */
  getPromptByLanguage(query) {
    return `${this.lang.query.systemPrompt}\n${this.lang.query.questionLabel}: ${query}`;
  }

  clearHistory() {
    this.chatHistory = [];
  }

  abort() {
    this._controller?.abort();
    this._aborted = true;
  }

  async * _streamJsonLines(reader, decoder) {
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);

          if (!line) continue;
          try {
            yield JSON.parse(line);
          } catch {}
        }
      }

      const tail = buffer.trim();
      if (tail) yield JSON.parse(tail);
    } catch (e) {
      if (e.name === "AbortError") return; // swallow abort
      throw e;
    }
  }

  async run({
    lang,
    query,
    model,
    onToken,
    onDone,
    onCancel,
    onError,
    options = {},
    formatWithLanguagePrompt = true,
    rollbackUserOnFailure = true,
  }) {
    const effectiveLang = lang ?? this.defaultLang;
    let appendedUser = false;

    this.onToken = onToken
    this.lang = this.i18n?.[lang] ?? this.i18n?.[this.defaultLang];

    try {
      const content = formatWithLanguagePrompt
        ? this.getPromptByLanguage(query)
        : query;

      this.chatHistory.push({ role: "user", content });
      appendedUser = true;

      this._controller = new AbortController();
      this._aborted = false;

      const payload = {
        model,
        messages: this.chatHistory,
        stream: true,
        options,
      };

      if (this.keepAlive != null) {
        payload.keep_alive = this.keepAlive;
      }
      console.log(`${this.baseUrl}/api/chat`,this._controller.signal,JSON.stringify(payload))
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        signal: this._controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let full = "";

      for await (const json of this._streamJsonLines(reader, decoder)) {
        const text = json?.message?.content;
        if (text) {
          full += text;
          onToken?.(text);
        }

        if (json?.done) {
          this.chatHistory.push({ role: "assistant", content: full });
          onDone?.();
          return full;
        }
      }

      this.chatHistory.push({ role: "assistant", content: full });
      onDone?.();
      return full;

    } catch (e) {
      if (e?.name === "AbortError") {
        onCancel?.();
        // Do NOT rethrow — this is an expected cancellation
        return;
      }

      onError?.(e);

      if (rollbackUserOnFailure && appendedUser) {
        this.chatHistory.pop();
      }

      throw e; // only rethrow real errors
    } finally {
      this._controller = null;
    }
  }

  runQuery(args) {
    const promise = this.run(args);
    return new RunningChat(promise, () => this.abort());
  }
}

export class RunningChat {
  constructor(promise, abortFn) {
    this.promise = promise;
    this._abortFn = abortFn;
  }

  async cancel() {
    this._abortFn?.();
    try {
      await this.promise;
    } catch {}
  }
}