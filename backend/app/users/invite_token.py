import secrets
import hashlib
def generate_invite_token():
    raw_token=secrets.token_urlsafe(32)#entropy:randomness
    token_hash=hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token,token_hash    