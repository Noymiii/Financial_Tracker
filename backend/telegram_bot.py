"""
CEIS Telegram Bot — initialization and webhook endpoint.

ARCHITECTURAL RULE: This module only sets up the bot, registers
handlers, and exposes the webhook. All command logic lives in
telegram_handlers.py and telegram_helpers.py.
"""

import logging
from fastapi import APIRouter, Request
from telegram import Update
from telegram.ext import Application, CommandHandler

from backend.config import get_settings
from backend.telegram_handlers import (
    handle_start,
    handle_help,
    handle_balance,
    handle_spend,
    handle_income,
    handle_runway,
)
from backend.telegram_helpers import handle_history

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/telegram", tags=["telegram"])

_app: Application | None = None


async def get_telegram_app() -> Application:
    """Lazy-init the Telegram Application and register handlers."""
    global _app
    if _app is None:
        settings = get_settings()
        _app = (
            Application.builder()
            .token(settings.telegram_bot_token)
            .build()
        )
        _app.add_handler(CommandHandler("start", handle_start))
        _app.add_handler(CommandHandler("help", handle_help))
        _app.add_handler(CommandHandler("balance", handle_balance))
        _app.add_handler(CommandHandler("spend", handle_spend))
        _app.add_handler(CommandHandler("income", handle_income))
        _app.add_handler(CommandHandler("runway", handle_runway))
        _app.add_handler(CommandHandler("history", handle_history))
        await _app.initialize()
    return _app


@router.post("/webhook")
async def telegram_webhook(request: Request) -> dict:
    """Receive and process Telegram webhook updates."""
    app = await get_telegram_app()
    data = await request.json()
    update = Update.de_json(data, app.bot)
    await app.process_update(update)
    return {"status": "ok"}


async def send_telegram_alert(user_id: str, message: str):
    """Send a proactive alert to the user's Telegram."""
    from backend.user_service import get_supabase_client
    
    # helper to get telegram_id from DB
    client = get_supabase_client()
    res = client.table("users").select("telegram_id").eq("id", user_id).execute()
    
    if not res.data or not res.data[0].get("telegram_id"):
        print(f"DEBUG: No linked Telegram account for user {user_id}")
        return

    telegram_id = res.data[0]["telegram_id"]
    
    try:
        app = await get_telegram_app()
        await app.bot.send_message(chat_id=telegram_id, text=message, parse_mode="Markdown")
    except Exception as e:
        print(f"ERROR: Failed to send Telegram alert: {e}")
