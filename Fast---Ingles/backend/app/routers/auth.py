from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import timedelta
import logging

from app.database import get_db
from app.models.user import User
from app.utils.security import verify_password, get_password_hash, create_access_token, decode_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.schemas.user import UserResponse, UserCreate, Token 

# Define OAuth2 scheme for Swagger UI integration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"]
)

logger = logging.getLogger(__name__)

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    """Dependency to validate JWT and fetch current user."""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    return user

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    # 1. Check if email exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash password
    hashed_pw = get_password_hash(user_data.password)

    # 3. Create User
    new_user = User(
        email=user_data.email,
        password_hash=hashed_pw,
        name=user_data.name,
        role="user",
        status="active"
    )
    
    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except Exception as e:
        await db.rollback()
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Login and get JWT token."""
    # 1. Find user
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    # 2. Verify password
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, # OAuth2 spec recommends 400 for invalid creds
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2a. Check if active
    if user.status != 'active':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta inactiva. Contacte a soporte.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Generate Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user

class UserUpdate(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    # email updates usually require verification, skipping for now
    # password updates should be separate

@router.put("/me", response_model=UserResponse)
async def update_users_me(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user profile."""
    if user_data.name is not None:
        current_user.name = user_data.name
    if user_data.photo_url is not None:
        current_user.photo_url = user_data.photo_url
        
    await db.commit()
    await db.refresh(current_user)
    return current_user
    return current_user

# --- Avatar Upload ---
from fastapi import UploadFile, File
from app.services.storage_service import get_storage_service

@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload user avatar to MinIO."""
    storage = get_storage_service()
    
    # Read file content
    content = await file.read()
    
    # Optimize Image (Resize 400x400, WebP, Compress)
    optimized_content, content_type = storage.optimize_image(content)
    
    # Generate filename with new extension if changed
    import time
    ext = "webp" if content_type == "image/webp" else file.filename.split('.')[-1]
    filename = f"avatar_{current_user.id}_{int(time.time())}.{ext}"
    
    # Upload
    key = await storage.upload_image(
        optimized_content,
        filename,
        folder="profiles",
        content_type=content_type
    )
    
    # Get Public URL (or Presigned if private, but profiles usually public)
    # Assuming standard MinIO setup where bucket is not public-read by default?
    # Our storage service has get_presigned_url.
    # But for avatar, we want a persistent URL if possible.
    # If bucket is not public, we might need a proxy endpoint or long-lived presigned URL.
    # For now, let's use get_presigned_url with long expiry or assume public bucket policy was set?
    # Task 1053010b... fixed MinIO to be public.
    # So we can construct the URL directly or ask storage service.
    
    # storage.get_public_url(key) assumes public bucket.
    avatar_url = storage.get_public_url(key)
    
    
    # Update User
    current_user.photo_url = avatar_url
    await db.commit()
    await db.refresh(current_user)
    
    return current_user

@router.delete("/me/avatar", response_model=UserResponse)
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user avatar (unlink from profile)."""
    if current_user.photo_url:
        # TODO: Optional - Delete actual object from MinIO if needed
        # For now, we just unlink it to preserve history or avoid errors
        current_user.photo_url = None
        await db.commit()
        await db.refresh(current_user)
    
    return current_user
