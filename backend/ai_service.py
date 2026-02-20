"""
AI Service — Provides financial advice using Google Gemini.
"""

import google.generativeai as genai
from backend.config import get_settings

def get_financial_advice(user_profile: dict, financial_data: dict) -> str:
    """
    Generate a short, punchy financial tip based on user's data using Google Gemini.
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
        
        prompt = (
            f"You are a tough-love financial coach for a student. "
            f"Here is their situation:\n"
            f"- Balance: {balance}\n"
            f"- Daily Burn Rate: {burn_rate}\n"
            f"- Runway: {runway} days\n"
            f"- Free to Spend (after bills): {free_to_spend}\n\n"
            f"Provide a 3-step, actionable financial plan. "
            f"Be direct and slightly humorous/sarcastic if they are in danger (low runway). "
            f"If they are doing well, be encouraging but firm on maintaining discipline. "
            f"Format your response as a simple list with bullet points (•) and line breaks. "
            f"Do NOT use markdown headers, bold, or markdown asterisks."
        )
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        return response.text.strip()
        
    except Exception as e:
        print(f"ERROR: AI generation failed: {e}")
        return "The AI is meditating. Try again later."
