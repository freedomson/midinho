from langchain.callbacks.base import BaseCallbackHandler
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage

class MyStreamingHandler(BaseCallbackHandler):
    def setMsgCallback(self, callback):
      self.msgCallbak = callback;
    def on_llm_new_token(self, token: str, **kwargs):
        self.msgCallbak(token)
        # print(token, end='', flush=True)

chat_history = []

def create_chain(model, callback):
    my_handler = MyStreamingHandler()
    my_handler.setMsgCallback(callback)
    prompt = PromptTemplate.from_template("Answer user query: {query}")
    llm = ChatOllama(
        model=model, # "llama3:latest",
        streaming=True,
        callbacks=[my_handler],
        verbose=False
    )
    return llm

async def run_query(user_query, pythonSelectedModel, responseWriteCallback):
  user_prompt = PromptTemplate.from_template("Answer user query: {query}")
  formatted_query = user_prompt.format(query=user_query)
  chat_history.append(HumanMessage(content=formatted_query))
  chain = create_chain(pythonSelectedModel, responseWriteCallback)
  response = await chain.ainvoke(chat_history)
  chat_history.append(AIMessage(content=response.content))
