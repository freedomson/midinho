from langchain.callbacks.base import BaseCallbackHandler
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama import ChatOllama
from langchain.prompts import PromptTemplate

class MyStreamingHandler(BaseCallbackHandler):
    def setMsgCallback(self, callback):
      self.msgCallbak = callback;
    def on_llm_new_token(self, token: str, **kwargs):
        self.msgCallbak(token)
        print(token, end='', flush=True)

def create_chain(callback):
    my_handler = MyStreamingHandler()
    my_handler.setMsgCallback(callback)
    prompt = PromptTemplate.from_template("Answer user query: {query}")
    llm = ChatOllama(
        model="llama3:latest",
        streaming=True,
        callbacks=[my_handler],
        verbose=False
    )

    return prompt | llm | StrOutputParser()