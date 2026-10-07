from app.db.app_db import db
from bson import ObjectId
from datetime import datetime
conversations_collection=db["conversations"]
messages_collection=db["messages"]
async def create_conversation(company_id,user_id):
    conversation={
        "company_id":company_id,
        "created_by":user_id,
        "created_at":datetime.utcnow()
    }
    result= await conversations_collection.insert_one(conversation)
    return str(result.inserted_id)

async def save_messages(conversation_id,role,content):
    message={
        "conversation_id":ObjectId(conversation_id),
        "role":role,
        "content":content,
        "created_at":datetime.utcnow()
    }
    await messages_collection.insert_one(message)

async def get_conversation_data(conversation_id):
    messages = []
    cursor = (
        messages_collection
        .find({"conversation_id": ObjectId(conversation_id)})
        .sort("created_at", -1)  
        .limit(6)               
    )
    docs = await cursor.to_list(length=6)
    docs.reverse() 
    for doc in docs:
        messages.append({
            "role": doc["role"],
            "content": doc["content"]
        })
    return messages