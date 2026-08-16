/**
 * Strategy Registry
 * Registers and manages strategies by name
 */
import type { StrategyType, StrategyConfig, StrategyValidationResult } from '@/types/strategy';
import type { Strategy as StrategyInterface } from './interfaces';

export class StrategyRegistry {
  private strategies: Map<StrategyType, StrategyInterface> = new Map();
  private defaultConfigs: Map<StrategyType, StrategyConfig> = new Map();

  /**
   * Register a strategy
   */
  register(strategy: StrategyInterface): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Register multiple strategies
   */
  registerAll(strategies: StrategyInterface[]): void {
    for (const strategy of strategies) {
      this.register(strategy);
    }
  }

  /**
   * Get a strategy by name
   */
  get(name: StrategyType): StrategyInterface | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get all registered strategies
   */
  getAll(): StrategyInterface[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get all registered strategy names
   */
  getNames(): StrategyType[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if strategy is registered
   */
  has(name: StrategyType): boolean {
    return this.strategies.has(name);
  }

  /**
   * Set default config for a strategy
   */
  setDefaultConfig(name: StrategyType, config: StrategyConfig): void {
    this.defaultConfigs.set(name, config);
  }

  /**
   * Get default config for a strategy
   */
  getDefaultConfig(name: StrategyType): StrategyConfig | undefined {
    return this.defaultConfigs.get(name);
  }

  /**
   * Validate all registered strategies
   */
  validateAll(): Map<StrategyType, StrategyValidationResult> {
    const results = new Map<StrategyType, StrategyValidationResult>();

    for (const [name, strategy] of this.strategies) {
      const config = this.defaultConfigs.get(name);
      if (config) {
        results.set(name, strategy.validate(config));
      }
    }

    return results;
  }

  /**
   * Unregister a strategy
   */
  unregister(name: StrategyType): boolean {
    return this.strategies.delete(name);
  }

  /**
   * Clear all strategies
   */
  clear(): void {
    this.strategies.clear();
    this.defaultConfigs.clear();
  }
}

/**
 * Global strategy registry instance
 */
export const strategyRegistry = new StrategyRegistry();

/**
 * Strategy factory type
 */
export type StrategyFactory = (config: StrategyConfig) => StrategyInterface;

/**
 * Pre-configured strategy factories (to be implemented in Sprint 6)
 */
export const strategyFactories: Map<StrategyType, StrategyFactory> = new Map();
