from typing import List
from uuid import UUID
from backend.database import get_supabase_client
from backend.models import Asset, AssetCreate

def get_assets(user_id: str) -> List[Asset]:
    client = get_supabase_client()
    response = client.table("assets").select("*").eq("user_id", user_id).execute()
    return [Asset(**item) for item in response.data]

def create_asset(user_id: str, asset: AssetCreate) -> Asset:
    client = get_supabase_client()
    data = asset.model_dump()
    data["user_id"] = user_id
    response = client.table("assets").insert(data).execute()
    return Asset(**response.data[0])

def delete_asset(user_id: str, asset_id: str) -> bool:
    client = get_supabase_client()
    response = client.table("assets").delete().eq("id", asset_id).eq("user_id", user_id).execute()
    return len(response.data) > 0
