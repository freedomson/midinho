from langchain.callbacks.base import BaseCallbackHandler
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
import asyncio

class MyStreamingHandler(BaseCallbackHandler):
    def setMsgCallback(self, callback, donecallback):
      self.callback = callback;
      self.donecallback = donecallback;
    def on_llm_new_token(self, token: str, **kwargs):
      self.callback(token)
      # print(token, end='', flush=True)
    def on_llm_end(self, response, **kwargs):
      self.donecallback()

chat_history = []
timeout = 600
keepalive = "24h"

def create_chain(model, callback, donecallback):
    my_handler = MyStreamingHandler()
    my_handler.setMsgCallback(callback, donecallback)
    llm = ChatOllama(
        model=model, # "llama3:latest",
        streaming=True,
        callbacks=[my_handler],
        verbose=False,
        keep_alive=keepalive,
        timeout=timeout
    )
    return llm

def getPromptByLanguage(lang_code):
  match lang_code:
    case "pt_PT":
      prompt = "Renponde à pergunta do utilizador em português: {query}"
    case "en_US":
      prompt = "Answer user query in english: {query}"
    case _:
      prompt = "{query}"
  return PromptTemplate.from_template(prompt)

async def run(lang, user_query, pythonSelectedModel, callback, donecallback, cancelcallback, errorcallback):
    try:
        user_prompt = getPromptByLanguage(lang)
        formatted_query = user_prompt.format(query=user_query)
        chat_history.append(HumanMessage(content=formatted_query))
        chain = create_chain(pythonSelectedModel, callback, donecallback)
        response = await chain.ainvoke(chat_history, config={"timeout": timeout})
        chat_history.append(AIMessage(content=response.content))
    except asyncio.CancelledError:
        cancelcallback("Task was cancelled.")
    except Exception as e:
        # Handle other exceptions if needed
        print(f">Error: {e}")
        print(f">Calling error callback")
        errorcallback(e)

def run_query(lang, user_query, pythonSelectedModel, callback , donecallback, cancelcallback, errorcallback):
  return asyncio.create_task(
          run(lang, user_query, pythonSelectedModel, callback , donecallback, cancelcallback, errorcallback)
        )
