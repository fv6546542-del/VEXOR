from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import hashlib
import logging
import os
import secrets
import uuid

import bcrypt
import httpx
import jwt
import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, Response, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
app = FastAPI(title="VEXOR API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 30
REFRESH_DAYS = 14

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")

TIERS = {
    "free": {"id": "free", "name": "VEXOR Free", "price": 0, "community_limit": 50, "max_video": "720p", "badge": None, "lookup_key": None},
    "pulse": {"id": "pulse", "name": "VEXOR Pulse", "price": 14.99, "community_limit": 150, "max_video": "1080p", "badge": "pulse", "lookup_key": "vexor_pulse_monthly"},
    "ignite": {"id": "ignite", "name": "VEXOR Ignite", "price": 39.99, "community_limit": 300, "max_video": "4k", "badge": "ignite", "lookup_key": "vexor_ignite_monthly"},
}

def now() -> str:
    return datetime.now(timezone.utc).isoformat()

def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    tier_id = user.get("tier", "free")
    tier = TIERS.get(tier_id, TIERS["free"])
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "role": user.get("role", "Member"),
        "verified": user.get("verified", False),
        "avatar_url": user.get("avatar_url"),
        "banner_url": user.get("banner_url"),
        "bio": user.get("bio", ""),
        "activity": user.get("activity", ""),
        "tier": tier_id,
        "tier_name": tier["name"],
        "community_limit": tier["community_limit"],
        "badge": tier["badge"],
        "trial_ends_at": user.get("trial_ends_at"),
        "subscription_status": user.get("subscription_status", "none"),
        "auth_provider": user.get("auth_provider", "password"),
    }

def hash_password(value: str) -> str:
    return bcrypt.hashpw(value.encode(), bcrypt.gensalt()).decode()

def check_password(value: str, hashed: str) -> bool:
    return bcrypt.checkpw(value.encode(), hashed.encode())

def sign_token(user_id: str, token_type: str, expires: timedelta, jti: Optional[str] = None) -> str:
    payload = {"sub": user_id, "type": token_type, "exp": datetime.now(timezone.utc) + expires, "jti": jti or str(uuid.uuid4())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Autenticação necessária")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise ValueError("invalid token type")
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user

class AuthPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: Optional[str] = Field(default=None, min_length=2, max_length=32)

class RefreshPayload(BaseModel):
    refresh_token: str

class RecoveryPayload(BaseModel):
    email: EmailStr

class RecoveryVerifyPayload(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)

class CommunityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=48)
    description: str = Field(default="", max_length=240)

class ChannelCreate(BaseModel):
    name: str = Field(min_length=2, max_length=48)
    kind: str = "text"

class InviteCreate(BaseModel):
    expires_hours: int = Field(default=72, ge=1, le=720)

class ReportCreate(BaseModel):
    target_user_id: str
    reason: str = Field(min_length=3, max_length=500)

class ModerationAction(BaseModel):
    action: str
    reason: str = Field(default="", max_length=300)

class RoleUpdate(BaseModel):
    role: str

class TextPayload(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

class FriendAction(BaseModel):
    action: str

class RulesPayload(BaseModel):
    rules: List[str] = Field(min_length=1, max_length=30)

class ProfileUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=32)
    bio: Optional[str] = Field(default=None, max_length=280)
    activity: Optional[str] = Field(default=None, max_length=80)
    avatar_url: Optional[str] = Field(default=None, max_length=600)
    banner_url: Optional[str] = Field(default=None, max_length=600)

class CheckoutRequest(BaseModel):
    lookup_key: str
    origin_url: str

class GoogleSessionPayload(BaseModel):
    session_id: str = Field(min_length=8, max_length=200)

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, set] = {}

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        self.rooms.setdefault(room, set()).add(websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        self.rooms.get(room, set()).discard(websocket)

    async def broadcast(self, payload: dict, room: str, exclude: Optional[WebSocket] = None):
        for connection in list(self.rooms.get(room, set())):
            if connection is exclude:
                continue
            try:
                await connection.send_json(payload)
            except Exception:
                self.disconnect(connection, room)

manager = ConnectionManager()

@api_router.get("/")
async def root():
    return {"message": "Hello World", "product": "VEXOR", "version": "0.2.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(payload: StatusCheckCreate):
    item = StatusCheck(client_name=payload.client_name)
    document = item.model_dump()
    document["timestamp"] = document["timestamp"].isoformat()
    await db.status_checks.insert_one(document)
    return item

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    items = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item.get("timestamp"), str):
            item["timestamp"] = datetime.fromisoformat(item["timestamp"])
    return items

@api_router.post("/auth/register")
async def register(payload: AuthPayload):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}, {"_id": 0}):
        raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado")
    username = payload.username or email.split("@")[0]
    if await db.users.find_one({"username": username}, {"_id": 0}):
        raise HTTPException(status_code=409, detail="Nome de usuário indisponível")
    user = {"id": str(uuid.uuid4()), "email": email, "username": username, "password_hash": hash_password(payload.password), "role": "Member", "verified": False, "created_at": now()}
    await db.users.insert_one(user)
    community = {"id": str(uuid.uuid4()), "name": f"{username}'s Lab", "description": "Sua primeira comunidade VEXOR", "owner_id": user["id"], "created_at": now()}
    await db.communities.insert_one(community.copy())
    channel = {"id": str(uuid.uuid4()), "community_id": community["id"], "name": "general", "kind": "text", "created_at": now()}
    await db.channels.insert_one(channel.copy())
    await db.community_members.insert_one({"community_id": community["id"], "user_id": user["id"], "role": "Owner", "joined_at": now()})
    return await issue_tokens(user)

async def issue_tokens(user: Dict[str, Any]):
    refresh_jti = str(uuid.uuid4())
    refresh = sign_token(user["id"], "refresh", timedelta(days=REFRESH_DAYS), refresh_jti)
    await db.sessions.insert_one({"id": refresh_jti, "user_id": user["id"], "token_hash": hashlib.sha256(refresh.encode()).hexdigest(), "expires_at": (datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS)).isoformat(), "revoked": False})
    return {"access_token": sign_token(user["id"], "access", timedelta(minutes=ACCESS_MINUTES)), "refresh_token": refresh, "user": public_user(user)}

@api_router.post("/auth/login")
async def login(payload: AuthPayload):
    user = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or not check_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    return await issue_tokens(user)

@api_router.post("/auth/refresh")
async def refresh(payload: RefreshPayload):
    try:
        data = jwt.decode(payload.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if data.get("type") != "refresh":
            raise ValueError()
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Refresh token inválido")
    session = await db.sessions.find_one({"id": data["jti"], "revoked": False}, {"_id": 0})
    if not session or session["token_hash"] != hashlib.sha256(payload.refresh_token.encode()).hexdigest():
        raise HTTPException(status_code=401, detail="Sessão revogada")
    user = await db.users.find_one({"id": data["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    await db.sessions.update_one({"id": data["jti"]}, {"$set": {"revoked": True}})
    return await issue_tokens(user)

@api_router.post("/auth/logout")
async def logout(payload: RefreshPayload, request: Request, response: Response):
    await db.sessions.update_many({"token_hash": hashlib.sha256(payload.refresh_token.encode()).hexdigest()}, {"$set": {"revoked": True}})
    cookie_token = request.cookies.get("session_token")
    if cookie_token:
        await db.oauth_sessions.delete_one({"session_token": cookie_token})
        response.delete_cookie("session_token", path="/")
    return {"ok": True}

@api_router.post("/auth/recovery/request")
async def recovery(payload: RecoveryPayload):
    code = str(secrets.randbelow(900000) + 100000)
    await db.recovery_codes.update_one({"email": payload.email.lower()}, {"$set": {"email": payload.email.lower(), "code": code, "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}}, upsert=True)
    return {"message": "Código gerado para demonstração", "demo_code": code}

@api_router.post("/auth/recovery/verify")
async def verify_recovery(payload: RecoveryVerifyPayload):
    record = await db.recovery_codes.find_one({"email": payload.email.lower(), "code": payload.code}, {"_id": 0})
    if not record or datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Código inválido ou expirado")
    result = await db.users.update_one({"email": payload.email.lower()}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    await db.recovery_codes.delete_one({"email": payload.email.lower()})
    await db.sessions.update_many({"user_id": (await db.users.find_one({"email": payload.email.lower()}, {"_id": 0}))["id"]}, {"$set": {"revoked": True}})
    return {"ok": True, "message": "Senha atualizada. Faça login novamente."}

@api_router.get("/auth/me")
async def me(user: Dict[str, Any] = Depends(current_user)):
    return public_user(user)

@api_router.post("/auth/google/session")
async def google_session(payload: GoogleSessionPayload, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    try:
        async with httpx.AsyncClient(timeout=12) as http:
            emergent = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_id},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Falha ao contatar Emergent Auth")
    if emergent.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão Google inválida ou expirada")
    data = emergent.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="E-mail não retornado pelo Google")
    session_token = data.get("session_token")
    picture = data.get("picture")
    display_name = data.get("name") or email.split("@")[0]
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        username = email.split("@")[0].replace(".", "_")[:32] or f"user_{uuid.uuid4().hex[:6]}"
        if await db.users.find_one({"username": username}, {"_id": 0}):
            username = f"{username[:24]}_{uuid.uuid4().hex[:4]}"
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "username": username,
            "password_hash": "",
            "role": "Member",
            "verified": True,
            "avatar_url": picture,
            "bio": "",
            "activity": "",
            "auth_provider": "google",
            "tier": "free",
            "created_at": now(),
            "display_name": display_name,
        }
        await db.users.insert_one(user.copy())
        community = {"id": str(uuid.uuid4()), "name": f"{username}'s Lab", "description": "Sua primeira comunidade VEXOR", "owner_id": user["id"], "created_at": now()}
        await db.communities.insert_one(community.copy())
        channel = {"id": str(uuid.uuid4()), "community_id": community["id"], "name": "general", "kind": "text", "created_at": now()}
        await db.channels.insert_one(channel.copy())
        await db.community_members.insert_one({"community_id": community["id"], "user_id": user["id"], "role": "Owner", "joined_at": now()})
    else:
        updates: Dict[str, Any] = {"auth_provider": user.get("auth_provider") or "google", "verified": True}
        if picture and not user.get("avatar_url"):
            updates["avatar_url"] = picture
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        user.update(updates)
    if session_token:
        await db.oauth_sessions.update_one(
            {"session_token": session_token},
            {"$set": {
                "session_token": session_token,
                "user_id": user["id"],
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "created_at": now(),
            }},
            upsert=True,
        )
        response.set_cookie("session_token", session_token, max_age=7 * 24 * 3600, httponly=True, secure=True, samesite="none", path="/")
    return await issue_tokens(user)

@api_router.get("/users/search")
async def search_users(q: str = Query(min_length=2), user: Dict[str, Any] = Depends(current_user)):
    users = await db.users.find({"username": {"$regex": q, "$options": "i"}, "id": {"$ne": user["id"]}}, {"_id": 0, "password_hash": 0}).to_list(20)
    return [public_user(item) for item in users]

@api_router.get("/friends")
async def list_friends(user: Dict[str, Any] = Depends(current_user)):
    records = await db.friendships.find({"$or": [{"requester_id": user["id"]}, {"recipient_id": user["id"]}]}, {"_id": 0}).to_list(200)
    ids = [record["recipient_id"] if record["requester_id"] == user["id"] else record["requester_id"] for record in records if record["status"] == "accepted"]
    friends = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(200)
    return [public_user(item) for item in friends]

@api_router.post("/friends/{target_user_id}")
async def friend_request(target_user_id: str, user: Dict[str, Any] = Depends(current_user)):
    if target_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Você não pode adicionar a si mesmo")
    target = await db.users.find_one({"id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    existing = await db.friendships.find_one({"$or": [{"requester_id": user["id"], "recipient_id": target_user_id}, {"requester_id": target_user_id, "recipient_id": user["id"]}]}, {"_id": 0})
    if existing and existing.get("status") == "accepted":
        return {"ok": True, "status": "accepted"}
    if existing and existing.get("status") == "pending":
        raise HTTPException(status_code=409, detail="Solicitação já enviada")
    record = {"id": str(uuid.uuid4()), "requester_id": user["id"], "recipient_id": target_user_id, "status": "pending", "created_at": now()}
    await db.friendships.update_one({"requester_id": user["id"], "recipient_id": target_user_id}, {"$setOnInsert": record}, upsert=True)
    return {"ok": True, "status": "pending"}

@api_router.patch("/friends/{request_id}")
async def friend_action(request_id: str, payload: FriendAction, user: Dict[str, Any] = Depends(current_user)):
    if payload.action not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Ação inválida")
    result = await db.friendships.update_one({"id": request_id, "recipient_id": user["id"], "status": "pending"}, {"$set": {"status": payload.action}})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    return {"ok": True, "status": payload.action}

@api_router.get("/dm/{target_user_id}")
async def get_dm(target_user_id: str, user: Dict[str, Any] = Depends(current_user)):
    query = {"$or": [{"sender_id": user["id"], "recipient_id": target_user_id}, {"sender_id": target_user_id, "recipient_id": user["id"]}]}
    return await db.direct_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(1000)

@api_router.post("/dm/{target_user_id}")
async def send_dm(target_user_id: str, payload: TextPayload, user: Dict[str, Any] = Depends(current_user)):
    target = await db.users.find_one({"id": target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    blocked = await db.blocks.find_one({"$or": [{"user_id": user["id"], "blocked_user_id": target_user_id}, {"user_id": target_user_id, "blocked_user_id": user["id"]}]}, {"_id": 0})
    if blocked:
        raise HTTPException(status_code=403, detail="DM bloqueada entre estes usuários")
    message = {"id": str(uuid.uuid4()), "sender_id": user["id"], "recipient_id": target_user_id, "text": payload.text.strip(), "created_at": now()}
    await db.direct_messages.insert_one(message.copy())
    return message

@api_router.get("/communities")
async def list_communities(user: Dict[str, Any] = Depends(current_user)):
    memberships = await db.community_members.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    ids = [item["community_id"] for item in memberships]
    return await db.communities.find({"id": {"$in": ids}}, {"_id": 0}).to_list(1000)

@api_router.post("/communities")
async def create_community(payload: CommunityCreate, user: Dict[str, Any] = Depends(current_user)):
    tier = TIERS.get(user.get("tier", "free"), TIERS["free"])
    owned = await db.communities.count_documents({"owner_id": user["id"]})
    if owned >= tier["community_limit"]:
        raise HTTPException(status_code=402, detail=f"Você atingiu o limite de {tier['community_limit']} comunidades do plano {tier['name']}. Faça upgrade para criar mais.")
    community = {"id": str(uuid.uuid4()), **payload.model_dump(), "owner_id": user["id"], "created_at": now()}
    await db.communities.insert_one(community.copy())
    await db.community_members.insert_one({"community_id": community["id"], "user_id": user["id"], "role": "Owner", "joined_at": now()})
    await write_audit(user, community["id"], "community.created", user["id"], payload.name)
    return community

@api_router.get("/communities/{community_id}/channels")
async def list_channels(community_id: str, user: Dict[str, Any] = Depends(current_user)):
    await require_member(community_id, user["id"])
    return await db.channels.find({"community_id": community_id}, {"_id": 0}).to_list(1000)

@api_router.get("/communities/{community_id}/rules")
async def get_rules(community_id: str, user: Dict[str, Any] = Depends(current_user)):
    await require_member(community_id, user["id"], enforce_rules=False)
    rules = await db.community_rules.find_one({"community_id": community_id}, {"_id": 0})
    return rules or {"community_id": community_id, "rules": [], "version": 1}

@api_router.put("/communities/{community_id}/rules")
async def update_rules(community_id: str, payload: RulesPayload, user: Dict[str, Any] = Depends(current_user)):
    membership = await require_member(community_id, user["id"], enforce_rules=False)
    if membership["role"] not in ("Owner", "Admin"):
        raise HTTPException(status_code=403, detail="Apenas Owner/Admin podem editar regras")
    rules = {"community_id": community_id, "rules": payload.rules, "version": int(datetime.now(timezone.utc).timestamp())}
    await db.community_rules.replace_one({"community_id": community_id}, rules, upsert=True)
    await write_audit(user, community_id, "rules.updated", user["id"], "regras atualizadas")
    return rules

@api_router.post("/communities/{community_id}/rules/accept")
async def accept_rules(community_id: str, user: Dict[str, Any] = Depends(current_user)):
    await require_member(community_id, user["id"], enforce_rules=False)
    rules = await db.community_rules.find_one({"community_id": community_id}, {"_id": 0})
    await db.rules_acceptance.update_one({"community_id": community_id, "user_id": user["id"]}, {"$set": {"community_id": community_id, "user_id": user["id"], "version": rules.get("version", 1) if rules else 1, "accepted_at": now()}}, upsert=True)
    return {"ok": True, "accepted": True}

@api_router.post("/communities/{community_id}/channels")
async def create_channel(community_id: str, payload: ChannelCreate, user: Dict[str, Any] = Depends(current_user)):
    membership = await require_member(community_id, user["id"])
    if membership["role"] not in ("Owner", "Admin"):
        raise HTTPException(status_code=403, detail="Sem permissão para criar canais")
    channel = {"id": str(uuid.uuid4()), "community_id": community_id, **payload.model_dump(), "created_at": now()}
    await db.channels.insert_one(channel.copy())
    await write_audit(user, community_id, "channel.created", user["id"], payload.name)
    return channel

@api_router.get("/channels/{channel_id}/messages")
async def list_messages(channel_id: str, user: Dict[str, Any] = Depends(current_user)):
    channel = await db.channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Canal não encontrado")
    await require_member(channel["community_id"], user["id"])
    return await db.messages.find({"channel_id": channel_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)

@api_router.post("/communities/{community_id}/invites")
async def create_invite(community_id: str, payload: InviteCreate, user: Dict[str, Any] = Depends(current_user)):
    await require_member(community_id, user["id"])
    invite = {"id": secrets.token_urlsafe(8), "community_id": community_id, "created_by": user["id"], "expires_at": (datetime.now(timezone.utc) + timedelta(hours=payload.expires_hours)).isoformat(), "created_at": now()}
    await db.invites.insert_one(invite.copy())
    return invite

@api_router.post("/invites/{invite_id}/accept")
async def accept_invite(invite_id: str, user: Dict[str, Any] = Depends(current_user)):
    invite = await db.invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite or datetime.fromisoformat(invite["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Convite inválido ou expirado")
    await db.community_members.update_one({"community_id": invite["community_id"], "user_id": user["id"]}, {"$setOnInsert": {"community_id": invite["community_id"], "user_id": user["id"], "role": "Member", "joined_at": now()}}, upsert=True)
    return {"ok": True, "community_id": invite["community_id"]}

@api_router.post("/communities/{community_id}/reports")
async def report_user(community_id: str, payload: ReportCreate, user: Dict[str, Any] = Depends(current_user)):
    await require_member(community_id, user["id"])
    report = {"id": str(uuid.uuid4()), "community_id": community_id, "reporter_id": user["id"], **payload.model_dump(), "status": "open", "created_at": now()}
    await db.reports.insert_one(report.copy())
    await write_audit(user, community_id, "user.reported", payload.target_user_id, payload.reason)
    return report

@api_router.post("/users/{target_user_id}/block")
async def block_user(target_user_id: str, user: Dict[str, Any] = Depends(current_user)):
    await db.blocks.update_one({"user_id": user["id"], "blocked_user_id": target_user_id}, {"$set": {"user_id": user["id"], "blocked_user_id": target_user_id, "created_at": now()}}, upsert=True)
    return {"ok": True}

@api_router.post("/communities/{community_id}/members/{target_user_id}/moderate")
async def moderate(community_id: str, target_user_id: str, payload: ModerationAction, user: Dict[str, Any] = Depends(current_user)):
    membership = await require_member(community_id, user["id"])
    if membership["role"] not in ("Owner", "Admin", "Moderator"):
        raise HTTPException(status_code=403, detail="Sem permissão de moderação")
    if payload.action not in ("kick", "ban", "unban"):
        raise HTTPException(status_code=400, detail="Ação inválida")
    if payload.action == "ban":
        await db.bans.update_one({"community_id": community_id, "user_id": target_user_id}, {"$set": {"community_id": community_id, "user_id": target_user_id, "reason": payload.reason, "created_at": now()}}, upsert=True)
    elif payload.action == "kick":
        await db.community_members.delete_one({"community_id": community_id, "user_id": target_user_id})
    else:
        await db.bans.delete_one({"community_id": community_id, "user_id": target_user_id})
    await write_audit(user, community_id, f"member.{payload.action}", target_user_id, payload.reason)
    return {"ok": True, "action": payload.action}

@api_router.patch("/communities/{community_id}/members/{target_user_id}/role")
async def update_role(community_id: str, target_user_id: str, payload: RoleUpdate, user: Dict[str, Any] = Depends(current_user)):
    membership = await require_member(community_id, user["id"])
    if membership["role"] != "Owner" or payload.role not in ("Admin", "Moderator", "Member"):
        raise HTTPException(status_code=403, detail="Apenas o Owner pode alterar este cargo")
    await db.community_members.update_one({"community_id": community_id, "user_id": target_user_id}, {"$set": {"role": payload.role}})
    await write_audit(user, community_id, "member.role_updated", target_user_id, payload.role)
    return {"ok": True, "role": payload.role}

@api_router.get("/communities/{community_id}/audit-log")
async def audit_log(community_id: str, user: Dict[str, Any] = Depends(current_user)):
    membership = await require_member(community_id, user["id"])
    if membership["role"] not in ("Owner", "Admin", "Moderator"):
        raise HTTPException(status_code=403, detail="Sem acesso ao audit log")
    return await db.audit_logs.find({"community_id": community_id}, {"_id": 0}).sort("created_at", -1).to_list(500)

async def require_member(community_id: str, user_id: str, enforce_rules: bool = True):
    membership = await db.community_members.find_one({"community_id": community_id, "user_id": user_id}, {"_id": 0})
    if not membership:
        raise HTTPException(status_code=403, detail="Você não faz parte desta comunidade")
    banned = await db.bans.find_one({"community_id": community_id, "user_id": user_id}, {"_id": 0})
    if banned:
        raise HTTPException(status_code=403, detail="Você foi banido desta comunidade")
    rules = await db.community_rules.find_one({"community_id": community_id}, {"_id": 0})
    if enforce_rules and rules and rules.get("rules"):
        accepted = await db.rules_acceptance.find_one({"community_id": community_id, "user_id": user_id, "version": rules.get("version")}, {"_id": 0})
        if not accepted:
            raise HTTPException(status_code=403, detail="Aceite as regras da comunidade para continuar")
    return membership

async def write_audit(user: Dict[str, Any], community_id: str, action: str, target: str, reason: str):
    await db.audit_logs.insert_one({"id": str(uuid.uuid4()), "community_id": community_id, "actor_id": user["id"], "action": action, "target_id": target, "reason": reason, "created_at": now()})

@api_router.patch("/users/me")
async def update_profile(payload: ProfileUpdate, user: Dict[str, Any] = Depends(current_user)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "username" in updates and updates["username"] != user["username"]:
        clash = await db.users.find_one({"username": updates["username"], "id": {"$ne": user["id"]}}, {"_id": 0})
        if clash:
            raise HTTPException(status_code=409, detail="Nome de usuário indisponível")
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return public_user(fresh)

@api_router.get("/billing/tiers")
async def list_tiers():
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "tiers": [
            {**TIERS["free"], "features": ["Até 50 comunidades", "Voz + tela WebRTC 720p", "Chat em tempo real", "Amigos e DMs"]},
            {**TIERS["pulse"], "features": ["Até 150 comunidades", "Transmissão 1080p", "Trial de 30 dias", "Badge Pulse animado", "Bordas de avatar exclusivas"]},
            {**TIERS["ignite"], "features": ["Até 300 comunidades", "Transmissão 2K/4K", "Trial de 30 dias", "Badge Ignite premium", "Perfil com banner animado", "Suporte prioritário"]},
        ],
    }

@api_router.get("/billing/me")
async def my_billing(user: Dict[str, Any] = Depends(current_user)):
    return {
        "tier": user.get("tier", "free"),
        "subscription_status": user.get("subscription_status", "none"),
        "trial_ends_at": user.get("trial_ends_at"),
        "current_period_end": user.get("current_period_end"),
        "stripe_customer_id": user.get("stripe_customer_id"),
    }

@api_router.post("/billing/checkout")
async def create_checkout(payload: CheckoutRequest, user: Dict[str, Any] = Depends(current_user)):
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Faturamento indisponível")
    tier = next((tier for tier in TIERS.values() if tier["lookup_key"] == payload.lookup_key), None)
    if not tier:
        raise HTTPException(status_code=400, detail="Plano inválido")
    prices = stripe.Price.list(lookup_keys=[payload.lookup_key], active=True, limit=1).data
    if not prices:
        raise HTTPException(status_code=500, detail=f"Preço não encontrado: {payload.lookup_key}")
    price = prices[0]
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        customer = stripe.Customer.create(email=user["email"], name=user["username"], metadata={"vexor_user_id": user["id"]})
        customer_id = customer.id
        await db.users.update_one({"id": user["id"]}, {"$set": {"stripe_customer_id": customer_id}})
    already_trialed = user.get("trial_used", False)
    subscription_data = {"metadata": {"vexor_user_id": user["id"], "tier": tier["id"]}}
    if not already_trialed:
        subscription_data["trial_period_days"] = 30
    session = stripe.checkout.Session.create(
        customer=customer_id,
        line_items=[{"price": price.id, "quantity": 1}],
        mode="subscription",
        success_url=f"{payload.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{payload.origin_url}/payment/cancel",
        subscription_data=subscription_data,
        metadata={"vexor_user_id": user["id"], "tier": tier["id"], "lookup_key": payload.lookup_key},
    )
    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "user_id": user["id"],
        "lookup_key": payload.lookup_key,
        "tier": tier["id"],
        "amount": (price.unit_amount or 0),
        "currency": price.currency,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now(),
        "updated_at": now(),
    })
    return {"checkout_url": session.url, "session_id": session.id}

@api_router.get("/billing/status/{session_id}")
async def billing_status(session_id: str, user: Dict[str, Any] = Depends(current_user)):
    record = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await _apply_paid_session(s)
                record = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["id"]}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    return {"session_id": record["session_id"], "status": record["status"], "payment_status": record["payment_status"], "tier": record.get("tier")}

@api_router.post("/billing/portal")
async def billing_portal(user: Dict[str, Any] = Depends(current_user)):
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="Nenhuma assinatura ativa")
    session = stripe.billing_portal.Session.create(customer=customer_id, return_url=os.environ.get("PORTAL_RETURN_URL", "https://vexor-dev.preview.emergentagent.com"))
    return {"url": session.url}

async def _apply_paid_session(session_obj: Any) -> None:
    sess = session_obj if isinstance(session_obj, dict) else session_obj.to_dict()
    metadata = sess.get("metadata") or {}
    user_id = metadata.get("vexor_user_id")
    tier_id = metadata.get("tier", "pulse")
    subscription_id = sess.get("subscription")
    current_period_end = None
    trial_end = None
    if subscription_id:
        try:
            sub = stripe.Subscription.retrieve(subscription_id)
            current_period_end = datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc).isoformat() if sub.get("current_period_end") else None
            trial_end = datetime.fromtimestamp(sub["trial_end"], tz=timezone.utc).isoformat() if sub.get("trial_end") else None
        except stripe.error.StripeError:
            pass
    await db.payment_transactions.update_one(
        {"session_id": sess["id"], "payment_status": {"$ne": "paid"}},
        {"$set": {
            "status": "completed",
            "payment_status": sess.get("payment_status", "paid"),
            "stripe_subscription_id": subscription_id,
            "updated_at": now(),
        }},
    )
    if user_id:
        await db.users.update_one({"id": user_id}, {"$set": {
            "tier": tier_id,
            "subscription_status": "trialing" if trial_end else "active",
            "stripe_subscription_id": subscription_id,
            "current_period_end": current_period_end,
            "trial_ends_at": trial_end,
            "trial_used": True,
        }})

@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except (stripe.error.SignatureVerificationError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await _apply_paid_session(obj)
    elif t == "customer.subscription.updated":
        customer_id = obj.get("customer")
        sub_status = obj.get("status")
        tier_id = (obj.get("metadata") or {}).get("tier") or "free"
        current_period_end = datetime.fromtimestamp(obj["current_period_end"], tz=timezone.utc).isoformat() if obj.get("current_period_end") else None
        await db.users.update_one({"stripe_customer_id": customer_id}, {"$set": {
            "subscription_status": sub_status,
            "current_period_end": current_period_end,
            "tier": tier_id if sub_status in ("trialing", "active") else "free",
        }})
    elif t == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        await db.users.update_one({"stripe_customer_id": customer_id}, {"$set": {"tier": "free", "subscription_status": "canceled"}})
    elif t == "invoice.payment_failed":
        customer_id = obj.get("customer")
        await db.users.update_one({"stripe_customer_id": customer_id}, {"$set": {"subscription_status": "past_due"}})
    return {"status": "ok"}


@app.websocket("/api/ws/{room}")
async def websocket_room(websocket: WebSocket, room: str, token: Optional[str] = Query(default=None)):
    user = None
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") == "access":
                user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        except jwt.PyJWTError:
            user = None
    if not user:
        await websocket.close(code=1008, reason="Autenticação necessária")
        return
    await manager.connect(websocket, room)
    await manager.broadcast({"type": "presence", "room": room, "status": "connected", "user_id": user["id"] if user else None}, room)
    try:
        while True:
            payload = await websocket.receive_json()
            if payload.get("type") == "message" and payload.get("text", "").strip():
                message = {"id": str(uuid.uuid4()), "channel_id": room, "author_id": user["id"] if user else "anonymous", "author": user["username"] if user else payload.get("author", "Você"), "text": payload["text"].strip(), "created_at": now()}
                await db.messages.insert_one(message.copy())
                await manager.broadcast({"type": "message", **message}, room)
            elif payload.get("type") in ("voice-join", "voice-offer", "voice-answer", "voice-ice", "screen-start", "screen-stop"):
                signal = {"type": "voice-peer-joined" if payload["type"] == "voice-join" else payload["type"], "peer_id": payload.get("peer_id"), "target_id": payload.get("target_id"), "description": payload.get("description"), "candidate": payload.get("candidate"), "has_audio": payload.get("has_audio", False)}
                await manager.broadcast(signal, room, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
        await manager.broadcast({"type": "presence", "room": room, "status": "disconnected", "user_id": user["id"] if user else None}, room)

app.include_router(api_router)
_cors_origins = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "*").split(",") if origin.strip()]
if _cors_origins == ["*"]:
    app.add_middleware(CORSMiddleware, allow_credentials=False, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
else:
    app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=_cors_origins, allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()