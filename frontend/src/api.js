const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Ha lejárt a token, dobjon ki, DE a login oldali hibás jelszónál NE frissítse az oldalt!
  if (response.status === 401 || response.status === 403) {
    if (endpoint !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('fleet_user');
      window.location.href = '/login'; 
    }
  }

  // Ha valami más hiba van (pl. 400, 404, 500, vagy 401 a loginon)
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || 'Szerverhiba történt.');
  }

  return response;
};