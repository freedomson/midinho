// ollama-chat.js
// Browser-only Ollama chat client with streaming + cancellation + history management.
// No npm. Uses fetch + ReadableStream + AbortController.

export class OllamaChat {
  constructor({
    baseUrl = "http://localhost:11434",
    debug = false,
    keepAlive = -1,          // note: sent as keep_alive for Ollama (if supported)
    defaultLang = "en_US",
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, ""); // trim trailing slash
    this.debug = debug;
    this.keepAlive = keepAlive;
    this.defaultLang = defaultLang;

    // Shared conversation state
    this.chatHistory = [];

    // Active request state
    this._controller = null;
    this._aborted = false;

    // Track current running handle (optional)
    this._current = null;
  }

  /* -------------------------
   * Prompt selection (same idea as your Python)
   * ------------------------- */
  getPromptByLanguage(langCode, query) {
    switch (langCode) {
      case "pt_PT":
        return `És um assistente pessoal. Responde em português. Pergunta: ${query}`;
      default:
        return `You are a personal assistant. Reply in English. Question: ${query}`;
    }
  }

  /* -------------------------
   * History control
   * ------------------------- */
  clearHistory() {
    if (this.debug) console.log("[ollama] clearHistory()");
    this.chatHistory = [];
  }

  // Optional: clear but keep a pinned system prompt if you add one later
  // Example usage: client.setSystemPrompt("You are ..."); client.clearHistory({ keepSystem: true })
  clearHistoryWithOptions({ keepSystem = false } = {}) {
    if (!keepSystem) return this.clearHistory();
    const system = this.chatHistory.filter(m => m.role === "system");
    this.chatHistory = system;
    if (this.debug) console.log("[ollama] clearHistory(keepSystem=true)", system);
  }

  // Optional helper if you want to add a system prompt message explicitly
  setSystemPrompt(content) {
    // Replace existing system prompt if present; otherwise prepend
    const idx = this.chatHistory.findIndex(m => m.role === "system");
    if (idx >= 0) this.chatHistory[idx] = { role: "system", content };
    else this.chatHistory.unshift({ role: "system", content });
  }

  /* -------------------------
   * Cancellation
   * ------------------------- */
  abort() {
    if (!this._controller) return;
    if (this._aborted) return;

    this._aborted = true;
    if (this.debug) console.log("[ollama] abort()");
    try {
      this._controller.abort();
    } catch (e) {
      if (this.debug) console.log("[ollama] abort error:", e);
    }
  }

  /* -------------------------
   * Streaming parser
   * Ollama streams JSON per line. Lines may be split across chunks.
   * This function yields parsed JSON objects.
   * ------------------------- */
  async * _streamJsonLines(reader, decoder) {
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);

        if (!line) continue;

        let obj;
        try {
          obj = JSON.parse(line);
        } catch (e) {
          // If JSON parsing fails here, it means a malformed line.
          // We won't drop buffer here because we've already split by newline;
          // so this line is genuinely invalid JSON.
          if (this.debug) console.warn("[ollama] invalid JSON line:", line, e);
          continue;
        }

        yield obj;
      }
    }

    // Final trailing buffer (no newline)
    const tail = buffer.trim();
    if (tail) {
      try {
        yield JSON.parse(tail);
      } catch (e) {
        if (this.debug) console.warn("[ollama] invalid trailing JSON:", tail, e);
      }
    }
  }

  /* -------------------------
   * Core run (async)
   * This is the "engine" similar to your Python run()
   * ------------------------- */
  async run({
    lang,
    query,
    model,
    onToken,
    onDone,
    onCancel,
    onError,
    // Ollama options passthrough (optional)
    options = {},
    // By default we format prompt based on language (like your Python)
    formatWithLanguagePrompt = true,
    // If true, rollback the last user message on cancel/error (like your Python)
    rollbackUserOnFailure = true,
  }) {
    const effectiveLang = lang ?? this.defaultLang;
    let appendedUser = false;

    try {
      const content = formatWithLanguagePrompt
        ? this.getPromptByLanguage(effectiveLang, query)
        : query;

      this.chatHistory.push({ role: "user", content });
      appendedUser = true;

      // Start request
      this._controller = new AbortController();
      this._aborted = false;

      const payload = {
        model,
        messages: this.chatHistory,
        stream: true,
        options: options ?? {},
      };

      // Ollama supports keep_alive in many builds; safe to include.
      if (this.keepAlive !== undefined && this.keepAlive !== null) {
        payload.keep_alive = this.keepAlive;
      }

      if (this.debug) console.log("[ollama] POST /api/chat", payload);

      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        signal: this._controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Ollama HTTP ${res.status}`);
      }
      if (!res.body) {
        throw new Error("Ollama response has no body/stream (res.body is null)");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let full = "";

      for await (const json of this._streamJsonLines(reader, decoder)) {
        // Standard Ollama streaming shape:
        // { message: { role: "assistant", content: "..." }, done: false }
        const text = json?.message?.content;
        if (text) {
          full += text;
          if (onToken) onToken(text);
        }

        if (json?.done) {
          this.chatHistory.push({ role: "assistant", content: full });
          if (onDone) onDone();
          return full;
        }
      }

      // If stream ended without done=true, treat as completion
      this.chatHistory.push({ role: "assistant", content: full });
      if (onDone) onDone();
      return full;

    } catch (e) {
      if (e?.name === "AbortError" || this._aborted) {
        if (this.debug) console.log("[ollama] cancelled");
        if (onCancel) onCancel();
      } else {
        if (this.debug) console.error("[ollama] error:", e);
        if (onError) onError(e);
      }

      // Rollback last user prompt (like your Python rollback on cancel/error)
      if (rollbackUserOnFailure && appendedUser) {
        const last = this.chatHistory[this.chatHistory.length - 1];
        if (last && last.role === "user") this.chatHistory.pop();
      }

      // Re-throw so callers can await and handle if they want
      throw e;

    } finally {
      this._controller = null;
    }
  }

  /* -------------------------
   * runQuery() returns a RunningChat handle
   * similar to your Python run_query -> RunningChat(task, state)
   * ------------------------- */
  runQuery({
    lang,
    query,
    model,
    onToken,
    onDone,
    onCancel,
    onError,
    options,
    formatWithLanguagePrompt = true,
    rollbackUserOnFailure = true,
  }) {
    // Cancel any previous active request if you want single-flight behavior:
    // (comment this out if you want concurrency)
    // if (this._current) this._current.cancel();

    const promise = this.run({
      lang,
      query,
      model,
      onToken,
      onDone,
      onCancel,
      onError,
      options,
      formatWithLanguagePrompt,
      rollbackUserOnFailure,
    });

    const handle = new RunningChat(promise, () => this.abort());
    this._current = handle;
    return handle;
  }
}

/* -------------------------
 * RunningChat handle
 * ------------------------- */
export class RunningChat {
  constructor(promise, abortFn) {
    this.promise = promise;
    this._abortFn = abortFn;
  }

  async cancel() {
    if (this._abortFn) this._abortFn();
    try {
      await this.promise;
    } catch (_) {
      // expected: AbortError or other
    }
  }
}
