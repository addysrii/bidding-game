const DEFAULT_BACKEND_URL = 'https://ipl-auction-user.onrender.com';

function normalizeUrl(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/[`'"]/g, '');
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveSocketUrl() {
  const candidate = normalizeUrl(import.meta.env.VITE_SOCKET_URL);

  // In production, never allow localhost fallback.
  if (import.meta.env.PROD) {
    if (!candidate || candidate.includes('localhost') || !isValidHttpUrl(candidate)) {
      return DEFAULT_BACKEND_URL;
    }
    return candidate;
  }

  if (candidate && isValidHttpUrl(candidate)) {
    return candidate;
  }

  return 'http://localhost:3000';
}

