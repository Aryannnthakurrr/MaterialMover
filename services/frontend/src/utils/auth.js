export function getToken() {
  return localStorage.getItem('token');
}

export function getRole() {
  return localStorage.getItem('role');
}

export function getEmail() {
  return localStorage.getItem('email');
}

export function isLoggedIn() {
  return !!getToken();
}

export function getAuthHeaders(json = true) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

export function checkTokenExpiry() {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    if (Date.now() >= expiryTime) {
      localStorage.clear();
      return false;
    }
    return true;
  } catch (e) {
    localStorage.clear();
    return false;
  }
}

export function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(price);
}
