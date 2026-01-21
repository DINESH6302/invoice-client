import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth';

// Define API Base URL
// Can be overridden with environment variable, defaults to localhost:9090 
export const API_BASE_URL = 'http://localhost:9090/v1';

export const refreshSession = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
             headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            const newAccessToken = data.access_token;
            const newRefreshToken = data.refresh_token || refreshToken;
            setTokens(newAccessToken, newRefreshToken);
            return true;
        }
    } catch (error) {
        console.error('Refresh session error', error);
    }
    return false;
};

export const apiFetch = async (endpoint, options = {}) => {
  let accessToken = getAccessToken();
  
  // Ensure headers object exists
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Handle URL construction
  let url = endpoint;
  if (!endpoint.startsWith('http')) {
      const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      // Allow passing partial paths like '/auth/login' which get appended to base
      // OR if we passed '/v1/...' and Base also has '/v1', we need to be careful
      // Simple strategy: If endpoint starts with /v1, and Base ends with /v1, strip one?
      // Or just assume API_BASE_URL is 'http://localhost:9090' and we append '/v1/...'
      
      // Current Decision: API_BASE_URL includes '/v1'. 
      // If endpoint also includes '/v1', we should likely act accordingly, 
      // but let's assume inputs are relative resource paths like 'auth/login' or '/auth/login'.
      
      // Remove leading slash from endpoint if present to join cleanly, or let URL constructor handle it?
      // Let's keep it simple: Replace /v1 prefix if it exists in endpoint to avoid duplication if API_BASE_URL has it.
      
      const cleanPath = path.replace(/^\/v1/, '');
      url = `${API_BASE_URL}${cleanPath}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return response;
    }

    try {
        console.log('Token expired, attempting refresh...');
        const success = await refreshSession();

        if (success) {
            const newAccessToken = getAccessToken();
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(url, {
                ...options,
                headers,
            });
        } else {
            console.error('Refresh failed');
            clearTokens();
            if (typeof window !== 'undefined') window.location.href = '/login';
        }
    } catch (error) {
        console.error('Refresh error', error);
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }

  return response;
};
