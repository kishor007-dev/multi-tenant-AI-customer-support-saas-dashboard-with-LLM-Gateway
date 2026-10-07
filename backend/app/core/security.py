from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
pwd_context=PasswordHash([Argon2Hasher()])
def hash_password(password:str)->str:
    return pwd_context.hash(password)

def verify_password(plain_password:str , hashed_password:str)->bool:
    return pwd_context.verify(plain_password,hashed_password)
