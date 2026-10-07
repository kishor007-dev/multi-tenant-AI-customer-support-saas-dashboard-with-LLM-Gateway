from pydantic import BaseModel,Field
from typing import Optional,Literal,List
from datetime import datetime
from enum import Enum
class MemberCreate(str,Enum):
    editor="editor"
    owner="owner"
class ProjectMemberCreate(BaseModel):
    user_id:str
    role:MemberCreate=MemberCreate.editor
class ProjectMemberOut(BaseModel):
    user_id:str
    role:MemberCreate
class ProjectCreate(BaseModel):
    name:str
    description:Optional[str]=None
    members:Optional[list[ProjectMemberCreate]]=Field(default_factory=list)

class ProjectOut(BaseModel):
    id:str
    name:str
    description:Optional[str]
    owner_id:str
    created_at:datetime
    members:list[ProjectMemberOut]

class ProjectUpdate(BaseModel):
    name:Optional[str]=None
    description:Optional[str]=None
    status:Optional[str]="active"