from pydantic import BaseModel
from datetime import datetime
class KBCreate(BaseModel):
    company_id:str
    content:str
class KBOut(BaseModel):
    id:str 
    company_id:str
    content:str
    created_at:datetime