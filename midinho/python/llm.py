from langchain.callbacks.base import BaseCallbackHandler
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage

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

timeout = 360
keepalive = "10m"

def create_chain(model, callback, donecallback):
    my_handler = MyStreamingHandler()
    my_handler.setMsgCallback(callback, donecallback)
    prompt = PromptTemplate.from_template("Answer user query: {query}")
    llm = ChatOllama(
        model=model, # "llama3:latest",
        streaming=True,
        callbacks=[my_handler],
        verbose=False,
        keep_alive=keepalive,
        timeout=timeout
    )
    return llm

async def run_query(user_query, pythonSelectedModel, callback , donecallback):
  user_prompt = PromptTemplate.from_template("Answer user query: {query}")
  formatted_query = user_prompt.format(query=user_query)
  chat_history.append(HumanMessage(content=formatted_query))
  chain = create_chain(pythonSelectedModel, callback, donecallback)
  response = await chain.ainvoke(chat_history, config={"timeout": timeout})
  chat_history.append(AIMessage(content=response.content))
