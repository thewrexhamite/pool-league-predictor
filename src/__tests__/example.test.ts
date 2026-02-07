/**
 * Example test file to verify Jest configuration
 * This serves as a smoke test for the CI/CD pipeline
 */

describe('Jest Configuration', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const message = 'Hello, Jest!';
    expect(message).toContain('Jest');
    expect(message.length).toBeGreaterThan(0);
  });

  it('should work with arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });

  it('should work with objects', () => {
    const config = {
      environment: 'test',
      debug: false,
    };
    expect(config).toHaveProperty('environment');
    expect(config.environment).toBe('test');
  });
});

describe('TypeScript Support', () => {
  it('should support TypeScript features', () => {
    interface TestData {
      id: number;
      name: string;
    }

    const data: TestData = {
      id: 1,
      name: 'Test Item',
    };

    expect(data.id).toBe(1);
    expect(data.name).toBe('Test Item');
  });

  it('should handle async operations', async () => {
    const asyncFunction = async (): Promise<string> => {
      return Promise.resolve('async result');
    };

    const result = await asyncFunction();
    expect(result).toBe('async result');
  });
});
