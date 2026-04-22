from fastapi import APIRouter

from app.services import auth_service

router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"],
)


@router.get("/verify")
def verify_apex_session(session_id: str = None, usr: str = None):
    return auth_service.verify_apex_session(session_id=session_id, username=usr)
