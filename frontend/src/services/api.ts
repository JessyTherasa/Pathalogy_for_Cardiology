const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── Token helper ─────────────────────────────────────────────────────────────
// Reads the stored auth token from localStorage (set by AuthContext on login).
function getStoredToken(): string | null {
  return localStorage.getItem('cardio_auth_token');
}

// ─── Core request function ────────────────────────────────────────────────────
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  currentRole: string = 'Cardiologist'
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Role': currentRole,   // kept for legacy audit logging
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach Bearer token if available — required by the RBAC backend
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

// ─── Case APIs ────────────────────────────────────────────────────────────────
export const getCases = (params: Record<string, string> = {}, role: string) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest<any[]>(`/cases${query ? `?${query}` : ''}`, {}, role);
};

export const getCaseDetail = (caseId: string, role: string) => {
  return apiRequest<any>(`/cases/${caseId}`, {}, role);
};

export const getCaseTimeline = (
  caseId: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  modality: string = 'All',
  role: string
) => {
  const query = new URLSearchParams({ sort: sortOrder, modality }).toString();
  return apiRequest<{ case_id: string; events: any[]; reviews: any[]; total_events: number }>(
    `/cases/${caseId}/timeline?${query}`,
    {},
    role
  );
};

export const getCaseSpecimens = (caseId: string, role: string) => {
  return apiRequest<any>(`/cases/${caseId}/specimens`, {}, role);
};

export const getCaseReviews = (caseId: string, role: string) => {
  return apiRequest<any[]>(`/cases/${caseId}/reviews`, {}, role);
};

export const getCaseAudit = (caseId: string, role: string) => {
  return apiRequest<any[]>(`/cases/${caseId}/audit`, {}, role);
};

// ─── Evidence Drill-down ──────────────────────────────────────────────────────
export const getEvidenceDetail = (eventId: string, role: string) => {
  return apiRequest<any>(`/evidence/${eventId}`, {}, role);
};

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const submitReviewDecision = (data: any, role: string) => {
  return apiRequest<any>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data)
  }, role);
};

// ─── Failure simulation ───────────────────────────────────────────────────────
export const triggerFailureApi = (
  failureType: 'missing' | 'stale' | 'lineage' | 'duplicate' | 'conflict' | 'unauthorized',
  params: Record<string, any> = {},
  role: string
) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest<any>(`/failures/${failureType}${query ? `?${query}` : ''}`, {
    method: 'POST'
  }, role);
};

// ─── Ingestion ────────────────────────────────────────────────────────────────
export const getIngestionStats = (role: string) => {
  return apiRequest<any>('/ingestion/stats', {}, role);
};

export const generateIngestionEvent = (actionType: string, caseId?: string, role: string = 'Administrator') => {
  const query = new URLSearchParams({ action_type: actionType, ...(caseId ? { case_id: caseId } : {}) }).toString();
  return apiRequest<any>(`/ingestion/generate?${query}`, {
    method: 'POST'
  }, role);
};

// ─── Experiment ───────────────────────────────────────────────────────────────
export const getExperimentResults = (role: string) => {
  return apiRequest<any>('/experiment/results', {}, role);
};

export const runExperimentTrial = (data?: any, role: string = 'Administrator') => {
  return apiRequest<any>('/experiment/run', {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  }, role);
};

// ─── Feedback ─────────────────────────────────────────────────────────────────
export const getFeedback = (role: string) => {
  return apiRequest<any[]>('/feedback', {}, role);
};

export const getFeedbackMetrics = (role: string) => {
  return apiRequest<any>('/feedback/metrics', {}, role);
};

export const submitFeedbackApi = (data: any, role: string) => {
  return apiRequest<any>('/feedback', {
    method: 'POST',
    body: JSON.stringify(data)
  }, role);
};

// ─── Audit ────────────────────────────────────────────────────────────────────
export const getAuditLogs = (params: Record<string, string> = {}, role: string) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest<any[]>(`/audit${query ? `?${query}` : ''}`, {}, role);
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardMetrics = (role: string) => {
  return apiRequest<any>('/dashboard/metrics', {}, role);
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = (role: string) => {
  return apiRequest<any>('/settings', {}, role);
};

export const updateSettings = (data: any, role: string) => {
  return apiRequest<any>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  }, role);
};

export const resetDatabase = (role: string) => {
  return apiRequest<any>('/settings/reset', {
    method: 'POST'
  }, role);
};

export const regenerateDataset = (role: string) => {
  return apiRequest<any>('/settings/regenerate', {
    method: 'POST'
  }, role);
};
