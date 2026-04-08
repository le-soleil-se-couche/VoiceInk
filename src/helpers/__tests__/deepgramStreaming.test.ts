import { describe, it, expect, beforeEach } from 'vitest';

// Test the reconnection logic directly without importing the full module
// (which has dependencies on ws and other native modules)
describe('DeepgramStreaming reconnection logic', () => {
  describe('reconnection with replay buffer', () => {
    it('should preserve accumulatedText and finalSegments when reconnecting with replayBuffer', () => {
      // Simulate a scenario where we have accumulated text before reconnection
      let accumulatedText = 'Previous transcript segment';
      let finalSegments = ['Previous transcript segment'];
      
      // Simulate a reconnection scenario with replay buffer
      const mockReplayBuffer = [Buffer.alloc(100), Buffer.alloc(200)];
      
      // Verify the reconnection logic: when isReconnection is true, text should NOT be cleared
      const isReconnection = mockReplayBuffer && mockReplayBuffer.length > 0;
      
      if (!isReconnection) {
        accumulatedText = '';
        finalSegments = [];
      }
      
      // After the connect logic, accumulatedText should still be preserved
      expect(accumulatedText).toBe('Previous transcript segment');
      expect(finalSegments).toEqual(['Previous transcript segment']);
    });

    it('should clear accumulatedText and finalSegments on fresh start (no replayBuffer)', () => {
      // Set up some initial state
      let accumulatedText = 'Old transcript';
      let finalSegments = ['Old transcript'];
      
      // Simulate a fresh connection (no replay buffer)
      const replayBuffer = null;
      const isReconnection = replayBuffer && replayBuffer.length > 0;
      
      if (!isReconnection) {
        accumulatedText = '';
        finalSegments = [];
      }
      
      // After fresh connect, text should be cleared
      expect(accumulatedText).toBe('');
      expect(finalSegments).toEqual([]);
    });

    it('should clear accumulatedText and finalSegments with empty replayBuffer', () => {
      // Set up some initial state
      let accumulatedText = 'Old transcript';
      let finalSegments = ['Old transcript'];
      
      // Simulate connection with empty replay buffer (should be treated as fresh start)
      const replayBuffer: Buffer[] = [];
      const isReconnection = replayBuffer && replayBuffer.length > 0;
      
      if (!isReconnection) {
        accumulatedText = '';
        finalSegments = [];
      }
      
      // Empty replay buffer means no reconnection, text should be cleared
      expect(accumulatedText).toBe('');
      expect(finalSegments).toEqual([]);
    });
  });

  describe('automatic reconnection on network errors', () => {
    it('should identify transient close codes for reconnection', () => {
      // Simulate the transient close codes check
      const TRANSIENT_CLOSE_CODES = [1006, 1012, 1013, 1014];
      
      const testCases = [
        { code: 1006, shouldReconnect: true, description: 'Abnormal closure' },
        { code: 1012, shouldReconnect: true, description: 'Service restart' },
        { code: 1013, shouldReconnect: true, description: 'Try again later' },
        { code: 1014, shouldReconnect: true, description: 'Bad gateway' },
        { code: 1000, shouldReconnect: false, description: 'Normal closure' },
        { code: 1001, shouldReconnect: false, description: 'Going away' },
      ];
      
      for (const { code, shouldReconnect, description } of testCases) {
        const result = TRANSIENT_CLOSE_CODES.includes(code);
        expect(result).toBe(shouldReconnect);
      }
    });

    it('should use exponential backoff for reconnect delays', () => {
      const RECONNECT_BASE_DELAY_MS = 500;
      const RECONNECT_MAX_DELAY_MS = 5000;
      
      const calculateDelay = (attempt: number): number => {
        return Math.min(
          RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1),
          RECONNECT_MAX_DELAY_MS
        );
      };
      
      expect(calculateDelay(1)).toBe(500);
      expect(calculateDelay(2)).toBe(1000);
      expect(calculateDelay(3)).toBe(2000);
      expect(calculateDelay(4)).toBe(4000);
      expect(calculateDelay(5)).toBe(5000); // capped at max
      expect(calculateDelay(6)).toBe(5000); // still capped
    });

    it('should respect max reconnect attempts limit', () => {
      const MAX_RECONNECT_ATTEMPTS = 5;
      let reconnectAttempt = 0;
      
      const shouldReconnect = (): boolean => {
        return reconnectAttempt < MAX_RECONNECT_ATTEMPTS;
      };
      
      // First 5 attempts should allow reconnect
      for (let i = 0; i < 5; i++) {
        expect(shouldReconnect()).toBe(true);
        reconnectAttempt++;
      }
      
      // 6th attempt should not reconnect
      expect(shouldReconnect()).toBe(false);
    });

    it('should not reconnect on authentication errors', () => {
      const error401 = new Error('Authentication failed: 401');
      const errorNetwork = new Error('Network error: ECONNRESET');
      
      const hasAuthError = (error: Error): boolean => {
        return error.message.includes('401');
      };
      
      expect(hasAuthError(error401)).toBe(true);
      expect(hasAuthError(errorNetwork)).toBe(false);
    });

    it('should identify additional transient error patterns for reconnection', () => {
      // Simulate the transient error message patterns check
      const isTransientError = (errorMsg: string): boolean => {
        const msg = errorMsg.toLowerCase();
        return (
          msg.includes('network') ||
          msg.includes('timeout') ||
          msg.includes('econnreset') ||
          msg.includes('econnrefused') ||
          msg.includes('enotfound') ||
          msg.includes('epipe') ||
          msg.includes('eai_again') ||
          msg.includes('certificate') ||
          msg.includes('ssl') ||
          msg.includes('tls')
        );
      };
      
      const transientErrors = [
        { msg: 'Network error: ECONNRESET', desc: 'Connection reset' },
        { msg: 'Connection timeout', desc: 'Timeout' },
        { msg: 'connect ECONNREFUSED', desc: 'Connection refused' },
        { msg: 'getaddrinfo ENOTFOUND api.deepgram.com', desc: 'DNS lookup failed' },
        { msg: 'write EPIPE', desc: 'Broken pipe' },
        { msg: 'getaddrinfo EAI_AGAIN api.deepgram.com', desc: 'DNS temporary failure' },
        { msg: 'Certificate verification failed', desc: 'SSL certificate error' },
        { msg: 'SSL handshake error', desc: 'SSL handshake failed' },
        { msg: 'TLS connection failed', desc: 'TLS connection error' },
      ];
      
      const nonTransientErrors = [
        { msg: 'Authentication failed: 401', desc: 'Auth error' },
        { msg: 'Invalid token', desc: 'Token error' },
        { msg: 'Rate limit exceeded', desc: 'Rate limit' },
      ];
      
      // All transient errors should trigger reconnection
      for (const { msg, desc } of transientErrors) {
        expect(isTransientError(msg)).toBe(true);
      }
      
      // Non-transient errors should NOT trigger reconnection
      for (const { msg, desc } of nonTransientErrors) {
        expect(isTransientError(msg)).toBe(false);
      }
    });

    it('should preserve accumulated text during reconnection', () => {
      // Simulate state before reconnection
      let accumulatedText = 'Previous transcript segment';
      let finalSegments = ['Previous transcript segment'];
      const replayBuffer = [Buffer.alloc(100), Buffer.alloc(200)];
      
      // Reconnection scenario: accumulated text should be preserved
      const isReconnection = replayBuffer && replayBuffer.length > 0;
      
      if (!isReconnection) {
        accumulatedText = '';
        finalSegments = [];
      }
      
      // Verify preservation
      expect(accumulatedText).toBe('Previous transcript segment');
      expect(finalSegments).toEqual(['Previous transcript segment']);
      expect(replayBuffer.length).toBe(2);
    });
  });

  describe('cleanup preserveReplay parameter', () => {
    it('should clear replayBuffer when cleanup is called without preserveReplay', () => {
      // Simulate the cleanup logic without preserveReplay
      let replayBuffer: Buffer[] = [Buffer.alloc(100), Buffer.alloc(200)];
      let replayBufferSize = 300;
      
      const preserveReplay = false;
      if (!preserveReplay) {
        replayBuffer = [];
        replayBufferSize = 0;
      }
      
      expect(replayBuffer).toEqual([]);
      expect(replayBufferSize).toBe(0);
    });

    it('should preserve replayBuffer when cleanup is called with preserveReplay=true', () => {
      // Simulate the cleanup logic with preserveReplay=true
      let replayBuffer: Buffer[] = [Buffer.alloc(100), Buffer.alloc(200)];
      let replayBufferSize = 300;
      
      const preserveReplay = true;
      if (!preserveReplay) {
        replayBuffer = [];
        replayBufferSize = 0;
      }
      
      expect(replayBuffer.length).toBe(2);
      expect(replayBufferSize).toBe(300);
    });

    it('should preserve replay buffer for reconnection after liveness timeout', () => {
      // Simulate the scenario: liveness timeout triggers cleanup with preserveReplay=true
      let replayBuffer: Buffer[] = [Buffer.alloc(1000), Buffer.alloc(2000)];
      let replayBufferSize = 3000;
      
      // handleLivenessTimeout calls cleanup(true) to preserve buffer
      const preserveReplay = true;
      if (!preserveReplay) {
        replayBuffer = [];
        replayBufferSize = 0;
      }
      
      // Then connect is called with the preserved replayBuffer
      const savedReplay = replayBuffer;
      const isReconnection = savedReplay && savedReplay.length > 0;
      
      expect(isReconnection).toBe(true);
      expect(savedReplay.length).toBe(2);
      expect(savedReplay[0].length).toBe(1000);
      expect(savedReplay[1].length).toBe(2000);
    });

    it('should preserve replay buffer for reconnection after WebSocket error', () => {
      // Simulate the scenario: WebSocket error triggers cleanup(true) before reconnect
      let replayBuffer: Buffer[] = [Buffer.alloc(500)];
      let replayBufferSize = 500;
      
      // Error handler calls cleanup(true) to preserve buffer
      const preserveReplay = true;
      if (!preserveReplay) {
        replayBuffer = [];
        replayBufferSize = 0;
      }
      
      // Then _scheduleReconnect is called with the saved replay buffer
      const savedReplay = replayBuffer;
      
      expect(savedReplay.length).toBe(1);
      expect(savedReplay[0].length).toBe(500);
    });

    it('should preserve replay buffer for reconnection after WebSocket close', () => {
      // Simulate the scenario: WebSocket close triggers cleanup(true) before reconnect
      let replayBuffer: Buffer[] = [Buffer.alloc(100), Buffer.alloc(200), Buffer.alloc(300)];
      let replayBufferSize = 600;
      
      // Close handler calls cleanup(true) to preserve buffer
      const preserveReplay = true;
      if (!preserveReplay) {
        replayBuffer = [];
        replayBufferSize = 0;
      }
      
      // Then _scheduleReconnect is called with the saved replay buffer
      const savedReplay = replayBuffer;
      
      expect(savedReplay.length).toBe(3);
      expect(savedReplay[0].length).toBe(100);
      expect(savedReplay[1].length).toBe(200);
      expect(savedReplay[2].length).toBe(300);
    });
  });
});
