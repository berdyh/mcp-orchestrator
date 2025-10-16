/**
 * Logger Tests
 */

import { createLogger, Logger } from '../logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger('test-module', 'info');
  });

  describe('createLogger', () => {
    it('should create a logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
    });
  });

  describe('logging methods', () => {
    it('should have all required logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should accept message and data parameters', () => {
      expect(() => logger.info('Test message')).not.toThrow();
      expect(() => logger.info('Test message', { data: 'value' })).not.toThrow();
    });
  });

  describe('log levels', () => {
    it('should create loggers with different levels', () => {
      const debugLogger = createLogger('test-module', 'debug');
      const errorLogger = createLogger('test-module', 'error');
      
      expect(debugLogger).toBeDefined();
      expect(errorLogger).toBeDefined();
    });
  });
});

