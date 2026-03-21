import asyncio
import httpx
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage

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

    # async generator / async iterator often has aclose()
    aclose = getattr(obj, "aclose", None)
    if callable(aclose):
        try:
            r = aclose()
            if asyncio.iscoroutine(r):
                await r
        except Exception:
            pass

    # ollama.AsyncClient uses close() (awaitable)
    close = getattr(obj, "close", None)
    if callable(close):
        try:
            r = close()
            if asyncio.iscoroutine(r):
                await r
        except Exception:
            pass


async def abort_request(state):
    """
    Ollama cancellation: close the connection that opened the request.
    Practically: close the ACTIVE stream first, then close underlying clients.
    """
    # 1) close the live stream generator/iterator FIRST
    await _close_any(state.get("stream"))

    # 2) close llm internals / clients best-effort
    llm = state.get("llm")
    if llm is not None:
        for attr in ("_async_client", "async_client", "_client", "client"):
            await _close_any(getattr(llm, attr, None))


class RunningChat:
    def __init__(self, task, state):
        self.task = task
        self._state = state

    def cancel(self):
        # cancel coroutine
        self.task.cancel()
        # abort network stream (fire-and-forget)
        asyncio.create_task(abort_request(self._state))


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
