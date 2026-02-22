"""
AI Service — Provides financial advice using Google Gemini.
Tailored for Filipino students using Philippine Pesos (₱).
"""

import google.generativeai as genai
from backend.config import get_settings


def get_financial_advice(user_profile: dict, financial_data: dict) -> str:
    """
    Generate a detailed financial analysis and actionable plan
    based on the user's real data, localized for PH students.
    """
    settings = get_settings()

    if not settings.gemini_api_key:
        return "AI Coach is sleeping (Missing Gemini API Key)."

    try:
        genai.configure(api_key=settings.gemini_api_key)

        balance = financial_data.get('balance', 0)
        burn_rate = financial_data.get('burn_rate', 0)
        runway = financial_data.get('runway_days', 0)
        free_to_spend = financial_data.get('free_to_spend', 0)
        period_commitments = financial_data.get('period_commitments', 0)
        monthly_commitments = financial_data.get('monthly_commitments', 0)

        # Expenses by category breakdown
        categories = financial_data.get('expenses_by_category', [])
        category_lines = ""
        if categories:
            for cat in categories:
                category_lines += (
                    f"  - {cat['category'].capitalize()}: "
                    f"₱{cat['value']:,.0f} ({cat['percent']}%)\n"
                )
        else:
            category_lines = "  - No expenses recorded yet.\n"

        # Bills info
        bills = financial_data.get('bills', [])
        bills_lines = ""
        if bills:
            for b in bills:
                due_info = (
                    f"due in {b['days_until_due']}d"
                    if b.get('is_due_this_period') else "not due yet"
                )
                bills_lines += (
                    f"  - {b['name']}: ₱{b['amount']:,.0f} "
                    f"({b['frequency']}, {due_info})\n"
                )
        else:
            bills_lines = "  - No fixed bills set up.\n"

        prompt = f"""You are a friendly, supportive financial coach for a Filipino college student.
All amounts are in Philippine Pesos (₱). The student lives in the Philippines.

Here is their current financial snapshot:

BALANCE & RUNWAY
- Current Balance: ₱{balance:,.2f}
- Daily Burn Rate: ₱{burn_rate:,.2f}/day
- Days of Funds Left: {runway:.1f} days
- Free to Spend (after bills): ₱{free_to_spend:,.2f}

COMMITMENTS
- Weekly Bill Reserve: ₱{period_commitments:,.2f}
- Monthly Fixed Costs: ₱{monthly_commitments:,.2f}

SPENDING BREAKDOWN (This Month)
{category_lines}
UPCOMING BILLS
{bills_lines}

Based on this data, provide:

1. A quick status check (1-2 sentences — are they doing okay, tight, or in trouble?)
2. Their top spending concern (which category is eating too much budget?)
3. A 3-step actionable plan with specific peso amounts where possible

Rules:
- STRICTLY SPEAK IN ENGLISH ONLY. Do not use Tagalog or Taglish.
- Always use ₱ symbol, never $ or USD.
- Reference Filipino student life (jeepney, canteen, load, etc.) when relevant, but keep the language English.
- Be warm but honest — like a supportive older sibling giving real advice.
- Keep it concise — no more than 200 words total.
- You CAN and SHOULD use Markdown (headers, bold text, bullet points) to format your response nicely."""

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)

        return response.text.strip()

    except Exception as e:
        print(f"ERROR: AI generation failed: {e}")
        return "The AI is taking a quick break. Please try again in a moment."
