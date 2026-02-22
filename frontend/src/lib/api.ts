import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

async function getAuthHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error("Not authenticated");
    }
    return {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
    };
}

export async function apiGet<T>(endpoint: string): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${endpoint}`, { headers });
    if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
    }
    return res.json();
}

export async function apiPost<T>(
    endpoint: string,
    body: unknown
): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errorBody = await res.text();
        console.error("API Post Error:", res.status, errorBody);
        throw new Error(`API error: ${res.status} - ${errorBody}`);
    }
    return res.json();
}

export async function apiPut<T>(
    endpoint: string,
    body: unknown
): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
    }
    return res.json();
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
        headers,
    });
    if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
    }
    return res.json();
}
