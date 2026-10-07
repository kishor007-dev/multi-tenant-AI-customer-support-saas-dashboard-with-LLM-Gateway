"""
app/services/email_service.py
Handles dispatching emails for team invites and notifications.
"""

import logging

logger = logging.getLogger(__name__)

async def send_invite_email(to_email: str, invite_token: str, org_name: str, inviter_name: str) -> bool:
    """
    Sends an invitation email to a new team member.
    For local development, this prints the invite link directly to the console.
    """
    # Assuming your Next.js frontend runs on localhost:3000
    invite_link = f"http://localhost:3000/join/{invite_token}"
    
    # --- MOCK EMAIL DISPATCH FOR DEVELOPMENT ---
    print("\n" + "═"*60)
    print(f"📧 EMAIL DISPATCHED TO : {to_email}")
    print(f"🏢 ORGANIZATION       : {org_name}")
    print(f"👤 INVITED BY         : {inviter_name}")
    print(f"🔗 SECURE INVITE LINK : {invite_link}")
    print("═"*60 + "\n")
    
    # TODO for Production: Replace the print statements above with actual SMTP logic
    # import smtplib
    # from email.message import EmailMessage
    # msg = EmailMessage()
    # msg.set_content(f"You have been invited to join {org_name}. Click here: {invite_link}")
    # ... send via smtplib
    
    return True
