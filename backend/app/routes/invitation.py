

"""
app/routes/invitation.py
Handles generating team invitations, sending emails, and accepting invites.
"""

from fastapi import Depends, APIRouter, HTTPException, status, Request
from datetime import datetime, timedelta
from bson import ObjectId
import hashlib
from pydantic import BaseModel

from app.dependencies.auth import get_current_user
from app.users.role_checker import require_role
from app.users.invite_token import generate_invite_token
from app.db.invitations import invitations_collection
from app.db.project_members import project_members_collection

# 🔥 Import the new services
from app.services.audit_logs_service import create_audit
from app.services.email_service import send_invite_email

router = APIRouter(tags=["Invitations"])

class InviteCreate(BaseModel):
    email: str      # Changed from username to email to reflect where we send the invite
    role: str

@router.post("/projects/{project_id}/invite")
async def invite_user(
    project_id: str,
    data: InviteCreate,
    request: Request,
    current_user: dict = Depends(require_role(["owner", "admin"])) # 🔥 Properly enforced role
):
    raw_token, token_hash = generate_invite_token()
    
    # 1. Create the invitation in the database
    invitation = {
        "org_id": ObjectId(current_user["org_id"]), # 🔥 Enforce multi-tenancy
        "project_id": ObjectId(project_id),
        "email": data.email,
        "role": data.role,
        "token_hash": token_hash,
        "status": "pending",
        "invited_by": current_user.get("user_id", current_user.get("user")),
        "expires_at": datetime.utcnow() + timedelta(days=3),
        "created_at": datetime.utcnow()
    }
    await invitations_collection.insert_one(invitation)

    # 2. Dispatch the Email
    try:
        await send_invite_email(
            to_email=data.email,
            invite_token=raw_token,
            org_name=current_user.get("org_name", "your organization"),
            inviter_name=current_user.get("username", "A team member")
        )
    except Exception as e:
        print(f"⚠️ Email dispatch failed: {e}")
        # We don't block the request if the email fails in development

    # 3. Log the Audit Event
    await create_audit(
        actor_id=current_user.get("user_id", current_user.get("user")),
        actor_name=current_user.get("username", "Unknown"),
        role=current_user.get("role", "member"),
        org_id=current_user["org_id"],
        action="member.invited",
        resource="invitation",
        resource_id=data.email,
        request=request
    )

    return {
        "message": "invitation created and email dispatched",
        "invite_token": raw_token
    }

class AcceptInvitation(BaseModel):
        token: str

@router.post("/invitations/Accept")
async def accept_invitation(
    data: AcceptInvitation,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    
    # 1. Find valid invitation
    invite = await invitations_collection.find_one({
        "token_hash": token_hash,
        "status": "pending",
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
 
    user_id = current_user.get("user_id", current_user.get("user"))

    # 2. Add user to the project
    await project_members_collection.insert_one({
        "org_id": invite.get("org_id", ObjectId(current_user["org_id"])), 
        "project_id": invite["project_id"],
        "user_id": user_id,
        "role": invite["role"],
        "joined_at": datetime.utcnow()
    })
    
    # 3. Mark invite as accepted
    await invitations_collection.update_one(
        {"_id": invite["_id"]},
        {"$set": {"status": "accepted"}}
    )

    # 4. Log the Audit Event
    await create_audit(
        actor_id=user_id,
        actor_name=current_user.get("username", "Unknown"),
        role=invite["role"],
        org_id=current_user["org_id"],
        action="member.invite_accepted",
        resource="invitation",
        resource_id=str(invite["_id"]),
        request=request
    )

    return {"message": "invitation accepted successfully"}
