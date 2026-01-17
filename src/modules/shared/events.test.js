import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, events, EVENTS } from './events.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on/emit', () => {
    it('should call listener when event is emitted', () => {
      const callback = vi.fn();
      eventBus.on('test', callback);
      eventBus.emit('test', { data: 'hello' });

      expect(callback).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('should call multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('test', callback1);
      eventBus.on('test', callback2);
      eventBus.emit('test', 'data');

      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should not call listeners for different events', () => {
      const callback = vi.fn();
      eventBus.on('event1', callback);
      eventBus.emit('event2', 'data');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove listener', () => {
      const callback = vi.fn();
      eventBus.on('test', callback);
      eventBus.off('test', callback);
      eventBus.emit('test', 'data');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('test', callback);

      unsubscribe();
      eventBus.emit('test', 'data');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only call listener once', () => {
      const callback = vi.fn();
      eventBus.once('test', callback);

      eventBus.emit('test', 'first');
      eventBus.emit('test', 'second');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });
  });

  describe('clear', () => {
    it('should clear specific event listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('event1', callback1);
      eventBus.on('event2', callback2);
      eventBus.clear('event1');

      eventBus.emit('event1', 'data');
      eventBus.emit('event2', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should clear all listeners when no event specified', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('event1', callback1);
      eventBus.on('event2', callback2);
      eventBus.clear();

      eventBus.emit('event1', 'data');
      eventBus.emit('event2', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should catch errors in listeners and continue', () => {
      const errorCallback = vi.fn(() => { throw new Error('test error'); });
      const successCallback = vi.fn();

      eventBus.on('test', errorCallback);
      eventBus.on('test', successCallback);

      // Should not throw
      expect(() => eventBus.emit('test', 'data')).not.toThrow();
      expect(successCallback).toHaveBeenCalled();
    });
  });
});

describe('EVENTS', () => {
  it('should have all required event types', () => {
    expect(EVENTS.FILE_UPLOADED).toBeDefined();
    expect(EVENTS.FILE_REMOVED).toBeDefined();
    expect(EVENTS.TABLE_RENAMED).toBeDefined();
    expect(EVENTS.QUERY_EXECUTED).toBeDefined();
    expect(EVENTS.ERROR).toBeDefined();
  });
});

describe('events singleton', () => {
  it('should be an EventBus instance', () => {
    expect(events).toBeInstanceOf(EventBus);
  });
});
