"""
CEIS Telegram Handlers — command implementations.

ARCHITECTURAL RULE: Handlers only parse input and dispatch
to service functions. No direct DB calls or business logic.
"""

import logging
from telegram import Update
from telegram.ext import ContextTypes

from backend import user_service, transaction_service
from backend.models import TransactionCreate
from backend.telegram_helpers import (
    get_user_or_warn,
    parse_transaction_args,
)
from backend import token_store

logger = logging.getLogger(__name__)


# ── /start ──────────────────────────────────────────────────


async def handle_start(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    """Register user and send welcome message."""
    tg_user = update.effective_user
    if context.args:
        # User trying to link account
        token = context.args[0]
        user_id = token_store.verify_and_consume_token(token)
        
        if user_id:
            success = user_service.link_telegram_account(user_id, tg_user.id)
            if success:
                await update.message.reply_text(
                    f"✅ **Account Linked Successfully!**\n"
                    f"Welcome, {tg_user.first_name}. Your Telegram is now connected to your web dashboard.\n"
                    f"You will receive alerts here.",
                    parse_mode="Markdown"
                )
                return
            else:
                 await update.message.reply_text("❌ Failed to link account. Please try again.")
                 return
        else:
             await update.message.reply_text("❌ Invalid or expired link token.")
             return

    user_service.get_or_create_telegram_user(
        telegram_id=tg_user.id,
        display_name=tg_user.first_name or "Student",
    )
    await update.message.reply_text(
        f"Welcome to CEIS, {tg_user.first_name}! 🎓💰\n\n"
        "I'll help you track expenses and monitor your "
        "financial runway.\n\n"
        "**To link your web account:**\n"
        "Go to Settings > Telegram on the website and click 'Connect'.\n\n"
        "Start with:\n"
        "/balance <amount> — Set your current balance\n"
        "/spend <amount> [category] [note]\n"
        "/income <amount> [note]\n"
        "/runway — Days until broke\n"
        "/history — Recent transactions\n"
        "/help — All commands"
    )


# ── /help ───────────────────────────────────────────────────


async def handle_help(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    """Display all available commands."""
    await update.message.reply_text(
        "📘 *CEIS Commands*\n\n"
        "/balance <amount> — Set your balance\n"
        "/spend <amount> [category] [note] — Log expense\n"
        "/income <amount> [note] — Log income\n"
        "/runway — Check financial runway\n"
        "/history — Last 5 transactions\n"
        "/help — Show this message",
        parse_mode="Markdown",
    )


# ── /balance ────────────────────────────────────────────────


async def handle_balance(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    """Set or view the user's current balance."""
    user = await get_user_or_warn(update)
    if user is None:
        return

    if not context.args:
        balance = float(user.get("initial_balance", 0))
        await update.message.reply_text(
            f"💰 Current balance: ₱{balance:,.2f}\n"
            "Use /balance <amount> to update."
        )
        return

    try:
        amount = float(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ Please enter a valid number.")
        return

    user_service.update_balance(user["id"], amount)
    await update.message.reply_text(f"✅ Balance set to ₱{amount:,.2f}")


# ── /spend ──────────────────────────────────────────────────


async def handle_spend(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    """Log an expense: /spend <amount> [category] [note]."""
    user = await get_user_or_warn(update)
    if user is None:
        return

    if not context.args:
        await update.message.reply_text(
            "Usage: /spend <amount> [category] [note]"
        )
        return

    parsed = parse_transaction_args(context.args)
    if parsed is None:
        await update.message.reply_text("❌ Invalid amount.")
        return

    amount, category, description = parsed
    data = TransactionCreate(
        amount=amount,
        category=category,
        description=description,
        transaction_type="expense",
    )
    transaction_service.create_transaction(user["id"], data)
    await update.message.reply_text(
        f"💸 Expense logged: ₱{amount:,.2f} [{category}]"
    )


# ── /income ─────────────────────────────────────────────────


async def handle_income(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    """Log income: /income <amount> [note]."""
    user = await get_user_or_warn(update)
    if user is None:
        return

    if not context.args:
        await update.message.reply_text("Usage: /income <amount> [note]")
        return

    try:
        amount = float(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ Invalid amount.")
        return

    note = " ".join(context.args[1:]) if len(context.args) > 1 else ""
    data = TransactionCreate(
        amount=amount,
        category="income",
        description=note,
        transaction_type="income",
    )
    transaction_service.create_transaction(user["id"], data)
    await update.message.reply_text(f"💵 Income logged: ₱{amount:,.2f}")


# ── /runway ─────────────────────────────────────────────────


async def handle_runway(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    """Calculate and display financial runway."""
    user = await get_user_or_warn(update)
    if user is None:
        return

    balance = float(user.get("initial_balance", 0))
    if balance <= 0:
        await update.message.reply_text(
            "⚠️ Set your balance first with /balance <amount>"
        )
        return

    summary = transaction_service.get_runway_summary(
        user["id"], balance
    )
    status_icons = {
        "critical": "🚨", "warning": "⚠️",
        "stable": "📊", "healthy": "✅",
    }
    icon = status_icons.get(summary["status"], "📊")

    await update.message.reply_text(
        f"{icon} *Financial Runway*\n\n"
        f"Balance: ₱{balance:,.2f}\n"
        f"Burn Rate: ₱{summary['burn_rate']:,.2f}/day\n"
        f"Runway: *{summary['runway_days']:.0f} days*\n"
        f"Status: {summary['status'].upper()}",
        parse_mode="Markdown",
    )
