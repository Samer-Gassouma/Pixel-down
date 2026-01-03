// lib/backendHealth.ts - Check if backend is online

export async function checkBackendHealth(
  backendUrl: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  timeout: number = 3000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${backendUrl}`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function checkBackendWithRetry(
  backendUrl: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  retries: number = 2,
  timeout: number = 2000
): Promise<boolean> {
  for (let i = 0; i <= retries; i++) {
    const isHealthy = await checkBackendHealth(backendUrl, timeout);
    if (isHealthy) return true;
    if (i < retries) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}
