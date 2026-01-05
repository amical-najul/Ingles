"""
Diagnostics Router - Endpoints for System Check & Diagnosis.
Handles: Start, Audio Generation, Verification, Cleanup.
"""

import logging
import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.database import get_db
from app.models.system_diagnostic import SystemDiagnostic
from app.services.ai_service import get_active_ai_service
from app.services.storage_service import get_storage_service
from app.services.tts_service import generate_tts_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/diagnostics", tags=["Diagnostics"])

# Random topics for variety
RANDOM_TOPICS = [
    "Daily routines and habits",
    "Travel and adventure",
    "Cooking and kitchen",
    "Sports and fitness",
    "Technology and computers",
    "Nature and animals",
    "Music and entertainment",
    "Work and office",
    "Shopping and money",
    "Health and medicine"
]

# Constants
MINIO_TEST_FOLDER = "tests/diagnostics"
TEST_WORD_COUNT = 5


class DiagnosticStartResponse(BaseModel):
    run_id: str
    words: List[dict]
    topic: str


class DiagnosticWord(BaseModel):
    word: str
    pronunciation: str
    translation: str
    mnemonic: str
    minio_audio_key: str | None
    audio_verified: bool


class DiagnosticRunResponse(BaseModel):
    run_id: str
    words: List[DiagnosticWord]


@router.post("/start", response_model=DiagnosticStartResponse)
async def start_diagnostic(db: AsyncSession = Depends(get_db)):
    """
    Start a new diagnostic run:
    1. Cleanup ALL previous data (DB + MinIO)
    2. Generate 5 random verbs using AI
    3. Store in system_diagnostics table
    4. Return run_id and words
    """
    storage = get_storage_service()
    
    # 1. CLEANUP: Delete all previous diagnostic data
    logger.info("Cleaning up previous diagnostic data...")
    await db.execute(delete(SystemDiagnostic))
    await db.commit()
    
    # Delete test folder from MinIO
    try:
        storage.delete_folder(MINIO_TEST_FOLDER)
        logger.info(f"Deleted MinIO folder: {MINIO_TEST_FOLDER}")
    except Exception as e:
        logger.warning(f"Could not delete MinIO folder (may not exist): {e}")
    
    # 2. GENERATE: Get 5 random verbs from AI
    run_id = SystemDiagnostic.generate_run_id()
    topic = random.choice(RANDOM_TOPICS) + f" [Test #{random.randint(1000, 9999)}]"
    
    try:
        ai_service = await get_active_ai_service(db)
        words_data = await ai_service.generate_lesson(
            topic=topic,
            category="verbs",
            count=TEST_WORD_COUNT
        )
    except Exception as e:
        logger.error(f"AI generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
    
    # 3. STORE: Save to database
    for word_entry in words_data:
        diagnostic = SystemDiagnostic(
            run_id=run_id,
            word=word_entry.get("word", ""),
            pronunciation=word_entry.get("pronunciation", ""),
            translation=word_entry.get("translation", ""),
            mnemonic=word_entry.get("mnemonic", ""),
            minio_audio_key=None,
            audio_verified=False
        )
        db.add(diagnostic)
    
    await db.commit()
    
    logger.info(f"Diagnostic started: run_id={run_id}, words={len(words_data)}")
    
    return DiagnosticStartResponse(
        run_id=run_id,
        words=words_data,
        topic=topic
    )


class AudioGenerateRequest(BaseModel):
    word: str


@router.post("/{run_id}/audio")
async def generate_audio(
    run_id: str,
    request: AudioGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate audio for a single word and upload to MinIO test folder.
    """
    storage = get_storage_service()
    word = request.word
    
    # Find the diagnostic entry
    result = await db.execute(
        select(SystemDiagnostic).where(
            SystemDiagnostic.run_id == run_id,
            SystemDiagnostic.word == word
        )
    )
    diagnostic = result.scalar_one_or_none()
    
    if not diagnostic:
        raise HTTPException(status_code=404, detail=f"Word '{word}' not found in run {run_id}")
    
    # Generate TTS audio
    audio_data = await generate_tts_audio(word, "en-US")
    if not audio_data:
        raise HTTPException(status_code=500, detail="TTS generation failed")
    
    # Upload to MinIO test folder
    # Structure: tests/diagnostics/{run_id}/{word}.mp3
    safe_word = word.replace(" ", "_").replace("/", "-").lower()
    minio_key = f"{MINIO_TEST_FOLDER}/{run_id}/{safe_word}.mp3"
    
    try:
        await storage.upload_bytes(
            data=audio_data,
            key=minio_key,
            content_type="audio/mpeg"
        )
    except Exception as e:
        logger.error(f"MinIO upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"MinIO upload failed: {str(e)}")
    
    # Update database
    diagnostic.minio_audio_key = minio_key
    await db.commit()
    
    return {"status": "generated", "key": minio_key}


@router.get("/{run_id}", response_model=DiagnosticRunResponse)
async def get_diagnostic_run(run_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get all words for a diagnostic run.
    """
    result = await db.execute(
        select(SystemDiagnostic).where(SystemDiagnostic.run_id == run_id)
    )
    diagnostics = result.scalars().all()
    
    if not diagnostics:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    
    words = [
        DiagnosticWord(
            word=d.word,
            pronunciation=d.pronunciation or "",
            translation=d.translation or "",
            mnemonic=d.mnemonic or "",
            minio_audio_key=d.minio_audio_key,
            audio_verified=d.audio_verified
        )
        for d in diagnostics
    ]
    
    return DiagnosticRunResponse(run_id=run_id, words=words)


@router.get("/{run_id}/audio/{word}/url")
async def get_audio_url(run_id: str, word: str, db: AsyncSession = Depends(get_db)):
    """
    Get the public URL for a diagnostic audio file.
    """
    storage = get_storage_service()
    
    # Find the diagnostic entry
    result = await db.execute(
        select(SystemDiagnostic).where(
            SystemDiagnostic.run_id == run_id,
            SystemDiagnostic.word == word
        )
    )
    diagnostic = result.scalar_one_or_none()
    
    if not diagnostic or not diagnostic.minio_audio_key:
        return {"url": f"BROWSER_TTS::{word}", "fallback": True}
    
    # Check if file exists in MinIO
    if not storage.object_exists(diagnostic.minio_audio_key):
        return {"url": f"BROWSER_TTS::{word}", "fallback": True}
    
    # Get public URL
    url = storage.get_public_url(diagnostic.minio_audio_key)
    
    # Mark as verified
    diagnostic.audio_verified = True
    await db.commit()
    
    return {"url": url, "fallback": False}


@router.delete("/cleanup")
async def cleanup_diagnostics(db: AsyncSession = Depends(get_db)):
    """
    Manually cleanup all diagnostic data.
    """
    storage = get_storage_service()
    
    # Delete from DB
    result = await db.execute(delete(SystemDiagnostic))
    await db.commit()
    
    # Delete from MinIO
    try:
        storage.delete_folder(MINIO_TEST_FOLDER)
    except Exception as e:
        logger.warning(f"Could not delete MinIO folder: {e}")
    
    return {"status": "cleaned", "deleted_rows": result.rowcount}
