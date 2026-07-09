import { logger } from '../utils/logger';
import { env } from '../config/env';

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
  halfOpenAttempted: boolean;
}

const THRESHOLD = 3; // consecutive failures before opening
const RESET_TIMEOUT_MS = 30_000; // 30 seconds before trying half-open
const HALF_OPEN_TIMEOUT_MS = 5_000; // 5 seconds for half-open probe

const circuits = new Map<string, CircuitState>();

function getCircuit(name: string): CircuitState {
  if (!circuits.has(name)) {
    circuits.set(name, {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
      halfOpenAttempted: false,
    });
  }
  return circuits.get(name)!;
}

/**
 * Check if a circuit is open (failing) for a given service.
 * If open, throws an error to short-circuit the request.
 */
export function checkCircuit(name: string): void {
  const circuit = getCircuit(name);
  const now = Date.now();

  if (circuit.isOpen) {
    // Check if it's time to try half-open
    if (now - circuit.lastFailureTime >= RESET_TIMEOUT_MS) {
      circuit.halfOpenAttempted = true;
      logger.info(`Circuit ${name} half-open — allowing probe request`);
      return; // allow this request through (half-open probe)
    }
    throw new Error(`Circuit breaker open for ${name}. Skipping non-critical AI call.`);
  }
}

/**
 * Record a success for a circuit. Resets failure count.
 */
export function recordSuccess(name: string): void {
  const circuit = getCircuit(name);
  circuit.failures = 0;
  circuit.isOpen = false;
  circuit.halfOpenAttempted = false;
  circuit.lastFailureTime = 0;
}

/**
 * Record a failure for a circuit. Opens the circuit if threshold reached.
 */
export function recordFailure(name: string): void {
  const circuit = getCircuit(name);
  circuit.failures += 1;
  circuit.lastFailureTime = Date.now();

  if (circuit.failures >= THRESHOLD) {
    circuit.isOpen = true;
    logger.warn(`Circuit breaker opened for ${name} after ${circuit.failures} consecutive failures`);
  }
}

/**
 * Execute a function with circuit breaker protection.
 * If the circuit is open, the function is skipped and a fallback value is returned.
 * If the circuit is closed, the function is executed and success/failure is recorded.
 *
 * @param name - Circuit name (e.g., 'gemini', 'openrouter')
 * @param fn - Async function to execute
 * @param fallback - Fallback value or function to call when circuit is open
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T | (() => T),
): Promise<T> {
  try {
    checkCircuit(name);
    const result = await fn();
    recordSuccess(name);
    return result;
  } catch (err) {
    // Only count as failure if it wasn't a circuit rejection
    if (err instanceof Error && err.message.includes('Circuit breaker open')) {
      logger.warn(`Circuit breaker prevented call to ${name}`, { message: err.message });

      // Only log the circuit skip for non-critical services
      if (env.NODE_ENV === 'production') {
        logger.info(`AI service ${name} skipped due to circuit breaker — using fallback`);
      }

      // Return fallback
      if (typeof fallback === 'function') {
        return (fallback as () => T)();
      }
      return fallback;
    }
    recordFailure(name);
    throw err;
  }
}
