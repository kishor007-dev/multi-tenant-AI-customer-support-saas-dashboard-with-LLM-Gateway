import asyncio
from app.core.embedding_model import embedding_model
def _embed(text:str):
    return embedding_model.encode(
        text,
        normalize_embeddings=True
    ).tolist()
async def generate_embedding(text:str):
    loop=asyncio.get_running_loop()
    return await loop.run_in_executor(None,_embed,text)#none=threadpoolexcutor()
