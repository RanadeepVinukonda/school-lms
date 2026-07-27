type Factory<T> = () => T;

export class Container {
  private factories = new Map<string, Factory<unknown>>();
  private singletons = new Map<string, unknown>();

  register<T>(name: string, factory: Factory<T>, singleton = false): void {
    this.factories.set(name, factory as Factory<unknown>);
    if (singleton) {
      this.singletons.set(name, factory());
    }
  }

  resolve<T>(name: string): T {
    if (this.singletons.has(name)) {
      return this.singletons.get(name) as T;
    }
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`No registration found for: ${name}`);
    return factory() as T;
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }
}

export const container = new Container();

// Register common services
container.register('logger', () => require('../utils/logger').logger, true);
