import { CircuitBreaker, CircuitState } from '../../utils/circuit-breaker';

describe('CircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3, recoveryTimeoutMs: 1000 });
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('opens after failure threshold', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2, recoveryTimeoutMs: 1000 });
    const failingFn = jest.fn().mockRejectedValue(new Error('fail'));

    await cb.execute(failingFn).catch(() => {});
    await cb.execute(failingFn).catch(() => {});

    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('executes function when CLOSED', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3, recoveryTimeoutMs: 1000 });
    const successFn = jest.fn().mockResolvedValue('ok');

    const result = await cb.execute(successFn);
    expect(result).toBe('ok');
  });
});
