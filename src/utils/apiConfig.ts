/**
 * Get the API base URL based on the current host
 * When accessed from mobile/network, use the same host for API calls
 */
export function getApiBaseUrl(): string {
  // If VITE_API_BASE_URL is set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  // Check if we're accessing from a network IP (not localhost)
  const hostname = window.location.hostname
  const protocol = window.location.protocol // 'http:' or 'https:'
  
  // If accessing from localhost, use relative path (proxy will handle it)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api'
  }

  // If accessing from network IP, use direct backend access
  // Backend is configured to listen on 0.0.0.0:5000, so it's accessible from network
  // Use the same hostname but with backend port 5000
  const backendPort = import.meta.env.VITE_API_PORT || '5000'
  return `${protocol}//${hostname}:${backendPort}/api`
}

