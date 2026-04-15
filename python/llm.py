import asyncio
import httpx
import os
import uuid
import weakref
from typing import Any
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage

# Debug toggle (set LLM_DEBUG=0 to disable)
LLM_DEBUG = os.getenv("LLM_DEBUG", "1") not in ("0", "false", "False")

# track objects we've attempted to close to make abort idempotent
_closed_objs = weakref.WeakSet()

chat_history = []
keepalive = -1  # note: keeps model loaded; doesn't mean a request is still running


def getPromptByLanguage(lang_code):
    match lang_code:
        case "pt_PT":
            prompt = "És um assistente pessoal. Responde em português. Pergunta: {query}"
        case _:
            prompt = "You are a personal assistant. Reply in English. Question: {query}"
    return PromptTemplate.from_template(prompt)


def create_llm(model, timeout_connect=3.0, timeout_read=600.0):
    timeout_cfg = httpx.Timeout(
        connect=timeout_connect,
        read=timeout_read,
        write=timeout_read,
        pool=timeout_connect,
    )
    return ChatOllama(
        model=model,
        streaming=True,
        verbose=False,
        keep_alive=keepalive,
        client_kwargs={"timeout": timeout_cfg},
        async_client_kwargs={"timeout": timeout_cfg},
    )

async def _close_any(obj):
    """Close helper: supports async close(), async aclose(), and generator aclose()."""
    if obj is None:
        return
    if obj in _closed_objs:
        if LLM_DEBUG:
            print(f"[llm] _close_any: already closed {obj!r}")
        return

    if LLM_DEBUG:
        print(f"[llm] _close_any: attempting to close {obj!r} (type={type(obj)})")

    # mark early to avoid races attempting to close the same underlying resource
    try:
        _closed_objs.add(obj)
    except Exception:
        # some builtin objects may not be weakref-able; ignore
        pass

    # async generator / async iterator often has aclose()
    aclose = getattr(obj, "aclose", None)
    if callable(aclose):
        try:
            r = aclose()
            if asyncio.iscoroutine(r):
                await r
            if LLM_DEBUG:
                print(f"[llm] _close_any: aclose succeeded for {obj!r}")
            return
        except Exception as e:
            if LLM_DEBUG:
                print(f"[llm] _close_any: aclose failed for {obj!r}: {e}")

    # try close() (may be awaitable)
    close = getattr(obj, "close", None)
    if callable(close):
        try:
            r = close()
            if asyncio.iscoroutine(r):
                await r
            if LLM_DEBUG:
                print(f"[llm] _close_any: close succeeded for {obj!r}")
            return
        except Exception as e:
            if LLM_DEBUG:
                print(f"[llm] _close_any: close failed for {obj!r}: {e}")

    if LLM_DEBUG:
        print(f"[llm] _close_any: no close method found for {obj!r}")


async def abort_request(state):
    """
    Ollama cancellation: close the connection that opened the request.
    Practically: close the ACTIVE stream first, then close underlying clients.
    """
    call_id = uuid.uuid4().hex
    if LLM_DEBUG:
        print(f"[llm] abort_request: start id={call_id}")

    # 1) close the live stream generator/iterator FIRST
    await _close_any(state.get("stream"))

    # 2) close llm internals / clients best-effort
    llm = state.get("llm")
    if llm is not None:
        # try common attr names that may hold an ollama client wrapper
        for attr in ("_async_client", "async_client", "_client", "client"):
            ollama_client = getattr(llm, attr, None)
            if ollama_client is None:
                continue
            if LLM_DEBUG:
                print(f"[llm] abort_request[{call_id}]: found ollama wrapper via attr={attr}: {ollama_client!r}")

            # The underlying httpx client is usually stored at ollama_client._client
            httpx_client = getattr(ollama_client, "_client", None)
            if httpx_client is not None:
                if LLM_DEBUG:
                    print(f"[llm] abort_request[{call_id}]: closing underlying httpx client: {httpx_client!r}")
                await _close_any(httpx_client)

            # also attempt to close the wrapper (some wrappers implement awaitable close())
            await _close_any(ollama_client)

    if LLM_DEBUG:
        print(f"[llm] abort_request: done id={call_id}")


class RunningChat:
    def __init__(self, task, state):
        self.task = task
        self._state = state

    async def cancel(self):
        # snapshot refs before task.cancel() triggers finally{} which clears them
        snapshot = {"stream": self._state.get("stream"), "llm": self._state.get("llm")}
        if LLM_DEBUG:
            print(f"[llm] RunningChat.cancel: cancelling task={self.task} snapshot={{'stream': snapshot.get('stream'), 'llm': snapshot.get('llm')}}")

        # signal cancellation to the running task
        self.task.cancel()

        # actively close network stream and underlying clients using the snapshot
        try:
            await abort_request(snapshot)
        except Exception as e:
            if LLM_DEBUG:
                print(f"[llm] RunningChat.cancel: abort_request raised: {e}")

        # wait for the task to finish to avoid races/double-cleanup
        try:
            await self.task
        except asyncio.CancelledError:
            # expected when task responds to cancellation
            if LLM_DEBUG:
                print(f"[llm] RunningChat.cancel: task {self.task} finished with CancelledError")
        except Exception as e:
            if LLM_DEBUG:
                print(f"[llm] RunningChat.cancel: task {self.task} finished with exception: {e}")


async def run(lang, user_query, model, token_callback, donecallback, cancelcallback, errorcallback, state):
    global chat_history

    appended_human = False
    state["llm"] = None
    state["stream"] = None

    try:
        user_prompt = getPromptByLanguage(lang)
        formatted_query = user_prompt.format(query=user_query)

        chat_history.append(HumanMessage(content=formatted_query))
        appended_human = True

        llm = create_llm(model)
        state["llm"] = llm

        collected = []

        # Create the stream iterator and STORE it so cancel() can close it
        stream = llm.astream(chat_history)
        state["stream"] = stream

        async for chunk in stream:
            text = getattr(chunk, "content", None)
            if text:
                collected.append(text)
                if token_callback:
                    token_callback(text)

        # success
        full = "".join(collected)
        chat_history.append(AIMessage(content=full))
        if donecallback:
            donecallback()

    except asyncio.CancelledError:
        if cancelcallback:
            cancelcallback()

        # Ensure network stream is closed (actual cancel mechanism for Ollama)
        await abort_request(state)

        # Optional: rollback the human message so cancelled prompts don't pollute history
        if appended_human and chat_history and isinstance(chat_history[-1], HumanMessage):
            chat_history.pop()

        raise

    except Exception as e:
        if errorcallback:
            errorcallback(e)
        await abort_request(state)

        if appended_human and chat_history and isinstance(chat_history[-1], HumanMessage):
            chat_history.pop()

    finally:
        state["stream"] = None
        state["llm"] = None


def run_query(lang, user_query, model, token_callback, donecallback, cancelcallback, errorcallback):
    state = {"llm": None, "stream": None}
    task = asyncio.create_task(
        run(lang, user_query, model, token_callback, donecallback, cancelcallback, errorcallback, state)
    )
    return RunningChat(task, state)
