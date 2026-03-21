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

    try:
        # Prepare only the last user prompt
        user_prompt = getPromptByLanguage(lang)
        formatted_query = user_prompt.format(query=user_query)

        # Keep history with only the last user message
        chat_history = [HumanMessage(content=formatted_query)]

        # Create the chain
        chain = create_chain(model, callback, donecallback)

        # Call the chain
        response = await chain.ainvoke(chat_history, config={"timeout": timeout})

        # Replace history with only the last AI response
        chat_history = [AIMessage(content=response.content)]

    except asyncio.CancelledError:
        try:
            callback("\n[Cancelled]\n")
        except:
            pass
        cancelcallback("Task was cancelled.")

    except Exception as e:
        print(f">Error: {e}")
        errorcallback(e)

    finally:
        try:
            donecallback()
        except:
            pass


def run_query(lang, user_query, model, callback, donecallback, cancelcallback, errorcallback):
    return asyncio.create_task(
        run(lang, user_query, model, callback, donecallback, cancelcallback, errorcallback)
    )
