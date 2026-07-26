export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;

  constructor(createFn: () => T) {
    this.createFn = createFn;
  }

  /**
   * Retrieves an instance from the pool or creates a new one if pool is empty.
   */
  get(): T {
    return this.pool.length > 0 ? this.pool.pop()! : this.createFn();
  }

  /**
   * Returns an instance back to the pool.
   */
  release(item: T): void {
    if (item) {
      this.pool.push(item);
    }
  }

  /**
   * Returns an array of instances back to the pool.
   */
  releaseAll(items: T[]): void {
    for (let i = 0; i < items.length; i++) {
      if (items[i]) {
        this.pool.push(items[i]);
      }
    }
  }

  // Backward compatibility methods for direct pool operations
  push(item: T): void {
    this.release(item);
  }

  pop(): T | undefined {
    return this.pool.pop();
  }

  get length(): number {
    return this.pool.length;
  }

  forEach(callback: (item: T, index: number) => void): void {
    this.pool.forEach(callback);
  }

  clear(): void {
    this.pool.length = 0;
  }
}
