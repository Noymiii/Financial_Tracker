"""
CEIS Telegram Helpers — shared utilities and /history handler.

Split from telegram_handlers.py to maintain the 200-line limit.
"""

import logging
from typing import Optional, Tuple

from telegram import Update
from telegram.ext import ContextTypes

from backend import user_service, transaction_service

logger = logging.getLogger(__name__)


# ── Shared Helpers ──────────────────────────────────────────


async def get_user_or_warn(update: Update) -> Optional[dict]:
    """
    Look up the Telegram user in the database.
    Sends a warning message if user is not registered.
    """
    tg_user = update.effective_user
    user = user_service.get_user_by_telegram_id(tg_user.id)
    if user is None:
        await update.message.reply_text(
            "⚠️ You're not registered yet. Send /start first."
        )
    return user


def parse_transaction_args(
    args: list,
) -> Optional[Tuple[float, str, str]]:
    """
    Parse /spend args: <amount> [category] [note].

    Returns:
        (amount, category, description) or None if invalid.
    """
    if not args:
        return None
    try:
        amount = float(args[0])
    except ValueError:
        return None

    category = args[1] if len(args) > 1 else "uncategorized"
    description = " ".join(args[2:]) if len(args) > 2 else ""
    return amount, category, description


# ── /history ────────────────────────────────────────────────


async def handle_history(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    """Show the last 5 transactions."""
    user = await get_user_or_warn(update)
    if user is None:
        return

    txns = transaction_service.get_transactions(user["id"], limit=5)

    if not txns:
        await update.message.reply_text(
            "📭 No transactions yet. Use /spend or /income."
        )
        return

    lines = ["📋 *Recent Transactions*\n"]
    for t in txns:
        icon = "🔴" if t["transaction_type"] == "expense" else "🟢"
        lines.append(
            f"{icon} ₱{t['amount']:,.2f} — {t['category']} "
            f"({t['transaction_date']})"
        )

    await update.message.reply_text(
        "\n".join(lines),
        parse_mode="Markdown",
    )
