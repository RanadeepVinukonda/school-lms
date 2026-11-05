import { aiCircuitBreaker } from '../utils/circuit-breaker';
import { logger } from '../utils/logger';

export async function callAIProvider(
  providerFn: () => Promise<Response>,
  providerName: string,
  maxRetries = 3
): Promise<unknown> {
  return aiCircuitBreaker.execute(async () => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await providerFn();
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${providerName} API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
          logger.warn(`Retry ${attempt + 1}/${maxRetries} for ${providerName}`, { error: lastError.message });
        }
      }
    }
    throw lastError;
  });
}
