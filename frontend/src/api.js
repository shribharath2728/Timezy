// API Client for Event Planner Backend (Journal Edition)
export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      credentials: 'include', // signed httpOnly session cookie included
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      const err = new Error("Please sign in with Google to sync your calendar and access your journal.");
      err.status = 401;
      throw err;
    }

    if (res.status === 502) {
      const err = new Error("The AI planning service is temporarily taking a breather or rate-limited. Please retry in a few seconds.");
      err.status = 502;
      throw err;
    }

    if (!res.ok) {
      let errorMsg = `Server error: ${res.status}`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.detail || errorJson.message || errorMsg;
      } catch {
        // Fallback
      }
      const err = new Error(errorMsg);
      err.status = res.status;
      throw err;
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (error) {
    if (error.status === 401 || error.status === 502) {
      throw error;
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Unable to reach the journal backend at ${API_BASE}. Please verify the server is running.`);
    }
    throw error;
  }
}

export const api = {
  // Auth
  getMe: () => fetchApi('/me'),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),

  // Dashboard & Plans
  getDashboard: () => fetchApi('/dashboard'),
  getPlans: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchApi(qs ? `/plans?${qs}` : '/plans');
  },
  getPlan: (id) => fetchApi(`/plans/${id}`),
  createPlan: (payload) => fetchApi('/plans', { method: 'POST', body: JSON.stringify(payload) }),
  patchPlanItem: (planId, itemId, payload) =>
    fetchApi(`/plans/${planId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  refinePlan: (id, payload) => fetchApi(`/plans/${id}/refine`, { method: 'POST', body: JSON.stringify(payload) }),
  schedulePlan: (id) => fetchApi(`/plans/${id}/schedule`, { method: 'POST' }),
  syncPlan: (id) => fetchApi(`/plans/${id}/sync`, { method: 'POST' }),
  setWishConsent: (id, payload) => fetchApi(`/plans/${id}/wish-consent`, { method: 'POST', body: JSON.stringify(payload) }),
};

