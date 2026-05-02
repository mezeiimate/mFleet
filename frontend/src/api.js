// frontend/src/api.js

// A környezeti változóból olvassa ki az URL-t, vagy ha nincs, használja a localhost-ot
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const apiFetch = async (endpoint, options = {}) => {
  // 1. Kikeresi a tokent a zsebből (localStorage)
  const token = localStorage.getItem('token');
  
  // 2. Összerakja a fejléceket
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 3. Ha van token, felmutatja (hozzáadja az Authorization header-höz)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 4. Elküldi a kérést az API-nak
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 5. Biztonsági háló: Ha a backend 401-et vagy 403-at dob (lejárt/rossz a token)
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('fleet_user');
    window.location.href = '/login'; // Kidobja a felhasználót a login oldalra
    throw new Error('A munkamenet lejárt, kérlek jelentkezz be újra!');
  }

  return response;
};