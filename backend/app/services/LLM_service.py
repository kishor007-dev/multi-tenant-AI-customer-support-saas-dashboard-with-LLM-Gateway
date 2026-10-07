from groq import AsyncGroq
from dotenv import load_dotenv
import os
load_dotenv()
client=AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
async def generate_ai_response(messages:list):
    response=await client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=messages,
    temperature=0.3
    ) 
    return response.choices[0].message.content



