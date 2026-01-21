export const setTokens = (accessToken, refreshToken) => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('access_token', accessToken);
  // Set refresh token in cookie, expires in 7 days (604800 seconds)
  document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
};

export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

export const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )refresh_token=([^;]+)'));
  return match ? match[2] : null;
};

export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  document.cookie = 'refresh_token=; path=/; max-age=0';
};
