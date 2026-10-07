from pydantic import BaseModel
class ChatModel(BaseModel):
    message:str
    company_id:str
