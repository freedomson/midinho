from langchain.callbacks.base import BaseCallbackHandler
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
import asyncio

# ------------------------
# Streaming handler
# ------------------------
class MyStreamingHandler(BaseCallbackHandler):
    def setMsgCallback(self, callback, donecallback):
        self.callback = callback
        self.donecallback = donecallback

    def on_llm_new_token(self, token: str, **kwargs):
        self.callback(token)

    def on_llm_end(self, response, **kwargs):
        self.donecallback()


# ------------------------
# Config
# ------------------------
timeout = 1000
keepalive = -1
chat_history = []

def create_chain(model, callback, donecallback):
    my_handler = MyStreamingHandler()
    my_handler.setMsgCallback(callback, donecallback)

    llm = ChatOllama(
        model=model,
        streaming=True,
        callbacks=[my_handler],
        verbose=False,
        keep_alive=keepalive,
        timeout=timeout,  # for internal usage
        client_kwargs={"timeout": timeout},          # sync client
        async_client_kwargs={"timeout": timeout},   # async client
        sync_client_kwargs={"timeout": timeout}     # explicit sync client
    )
    return llm


def getPromptByLanguage(lang_code):
    match lang_code:
        case "pt_PT":
            prompt = "És um assistente pessoal. Responde em português. Pergunta: {query}"
        case _:
            prompt = "You are a personal assistant. Reply in English. Question: {query}"
    return PromptTemplate.from_template(prompt)


# ------------------------
# Core run function
# ------------------------
async def run(lang, user_query, model, callback, donecallback, cancelcallback, errorcallback):

    global chat_history

    try:
        print(f"Running Chat")
        user_prompt = getPromptByLanguage(lang)
        formatted_query = user_prompt.format(query=user_query)
        chat_history.append(HumanMessage(content=formatted_query))
        chain = create_chain(model, callback, donecallback)
        response = await chain.ainvoke(chat_history)
        chat_history.append(AIMessage(content=response.content))

    except asyncio.CancelledError:
        js_print(f"User CancelledError")

    except Exception as e:
        print(f"Error -> errorcallback: {e}")
        errorcallback(e)

    finally:
        try:
            print(f"Done -> donecallback")
            donecallback()
        except:
            pass


def run_query(lang, user_query, model, callback, donecallback, cancelcallback, errorcallback):
    return asyncio.create_task(
        run(lang, user_query, model, callback, donecallback, cancelcallback, errorcallback)
    )
