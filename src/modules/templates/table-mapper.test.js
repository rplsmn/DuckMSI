/**
 * Tests for table-mapper.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableMapper } from './table-mapper.js';

describe('TableMapper', () => {
    let mapper;

    beforeEach(() => {
        mapper = new TableMapper();
    });

    describe('mapTable', () => {
        it('should map a table to a placeholder', () => {
            mapper.mapTable('fixe', 'my_fixe_table');

            expect(mapper.getActualTable('fixe')).toBe('my_fixe_table');
        });

        it('should overwrite existing mapping', () => {
            mapper.mapTable('fixe', 'old_table');
            mapper.mapTable('fixe', 'new_table');

            expect(mapper.getActualTable('fixe')).toBe('new_table');
        });

        it('should notify listeners when mapping', () => {
            const listener = vi.fn();
            mapper.subscribe(listener);

            mapper.mapTable('fixe', 'my_table');

            expect(listener).toHaveBeenCalledWith('map', 'fixe', 'my_table', undefined);
        });

        it('should include previous value in listener notification', () => {
            const listener = vi.fn();
            mapper.mapTable('fixe', 'old_table');
            mapper.subscribe(listener);

            mapper.mapTable('fixe', 'new_table');

            expect(listener).toHaveBeenCalledWith('map', 'fixe', 'new_table', 'old_table');
        });
    });

    describe('unmapTable', () => {
        it('should remove a mapping', () => {
            mapper.mapTable('fixe', 'my_table');
            mapper.unmapTable('fixe');

            expect(mapper.getActualTable('fixe')).toBeUndefined();
        });

        it('should notify listeners when unmapping', () => {
            const listener = vi.fn();
            mapper.mapTable('fixe', 'my_table');
            mapper.subscribe(listener);

            mapper.unmapTable('fixe');

            expect(listener).toHaveBeenCalledWith('unmap', 'fixe', null, 'my_table');
        });

        it('should not notify if placeholder was not mapped', () => {
            const listener = vi.fn();
            mapper.subscribe(listener);

            mapper.unmapTable('nonexistent');

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('unmapByActualTable', () => {
        it('should unmap by actual table name', () => {
            mapper.mapTable('fixe', 'my_table');

            const result = mapper.unmapByActualTable('my_table');

            expect(result).toBe('fixe');
            expect(mapper.getActualTable('fixe')).toBeUndefined();
        });

        it('should return null if table not found', () => {
            const result = mapper.unmapByActualTable('nonexistent');

            expect(result).toBeNull();
        });

        it('should notify listeners', () => {
            const listener = vi.fn();
            mapper.mapTable('fixe', 'my_table');
            mapper.subscribe(listener);

            mapper.unmapByActualTable('my_table');

            expect(listener).toHaveBeenCalledWith('unmap', 'fixe', null, 'my_table');
        });
    });

    describe('getPlaceholderForTable', () => {
        it('should return placeholder for mapped table', () => {
            mapper.mapTable('fixe', 'my_table');

            expect(mapper.getPlaceholderForTable('my_table')).toBe('fixe');
        });

        it('should return undefined for unmapped table', () => {
            expect(mapper.getPlaceholderForTable('nonexistent')).toBeUndefined();
        });
    });

    describe('getAllMappings', () => {
        it('should return empty object when no mappings', () => {
            expect(mapper.getAllMappings()).toEqual({});
        });

        it('should return all mappings as plain object', () => {
            mapper.mapTable('fixe', 'table1');
            mapper.mapTable('acte', 'table2');

            expect(mapper.getAllMappings()).toEqual({
                fixe: 'table1',
                acte: 'table2'
            });
        });
    });

    describe('getMappedPlaceholders', () => {
        it('should return empty Set when no mappings', () => {
            const result = mapper.getMappedPlaceholders();

            expect(result).toBeInstanceOf(Set);
            expect(result.size).toBe(0);
        });

        it('should return Set of mapped placeholders', () => {
            mapper.mapTable('fixe', 'table1');
            mapper.mapTable('acte', 'table2');

            const result = mapper.getMappedPlaceholders();

            expect(result.has('fixe')).toBe(true);
            expect(result.has('acte')).toBe(true);
            expect(result.size).toBe(2);
        });
    });

    describe('isMapped', () => {
        it('should return true for mapped placeholder', () => {
            mapper.mapTable('fixe', 'table');

            expect(mapper.isMapped('fixe')).toBe(true);
        });

        it('should return false for unmapped placeholder', () => {
            expect(mapper.isMapped('fixe')).toBe(false);
        });
    });

    describe('isTableMapped', () => {
        it('should return true if table is mapped to any placeholder', () => {
            mapper.mapTable('fixe', 'my_table');

            expect(mapper.isTableMapped('my_table')).toBe(true);
        });

        it('should return false if table is not mapped', () => {
            expect(mapper.isTableMapped('nonexistent')).toBe(false);
        });
    });

    describe('autoMap', () => {
        it('should auto-map exact match', () => {
            const result = mapper.autoMap('fixe');

            expect(result).toBe('fixe');
            expect(mapper.getActualTable('fixe')).toBe('fixe');
        });

        it('should auto-map case-insensitive match', () => {
            const result = mapper.autoMap('FIXE');

            expect(result).toBe('fixe');
            expect(mapper.getActualTable('fixe')).toBe('FIXE');
        });

        it('should auto-map partial match', () => {
            const result = mapper.autoMap('fixe_2024');

            expect(result).toBe('fixe');
            expect(mapper.getActualTable('fixe')).toBe('fixe_2024');
        });

        it('should return null for no match', () => {
            const result = mapper.autoMap('random_table');

            expect(result).toBeNull();
        });

        it('should not overwrite existing mapping with partial match', () => {
            mapper.mapTable('fixe', 'existing_table');

            const result = mapper.autoMap('fixe_2024');

            // Should not auto-map because fixe is already mapped
            expect(result).toBeNull();
            expect(mapper.getActualTable('fixe')).toBe('existing_table');
        });

        it('should auto-map exact match even if already mapped', () => {
            mapper.mapTable('fixe', 'old_table');

            const result = mapper.autoMap('fixe');

            // Exact match should update
            expect(result).toBe('fixe');
            expect(mapper.getActualTable('fixe')).toBe('fixe');
        });
    });

    describe('handleTableRename', () => {
        it('should update mapping when table is renamed', () => {
            mapper.mapTable('fixe', 'old_name');

            const result = mapper.handleTableRename('old_name', 'new_name');

            expect(result).toBe('fixe');
            expect(mapper.getActualTable('fixe')).toBe('new_name');
        });

        it('should return null if table was not mapped', () => {
            const result = mapper.handleTableRename('unknown', 'new_name');

            expect(result).toBeNull();
        });

        it('should notify listeners on rename', () => {
            const listener = vi.fn();
            mapper.mapTable('fixe', 'old_name');
            mapper.subscribe(listener);

            mapper.handleTableRename('old_name', 'new_name');

            expect(listener).toHaveBeenCalledWith('map', 'fixe', 'new_name', 'old_name');
        });
    });

    describe('subscribe', () => {
        it('should allow multiple subscribers', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            mapper.subscribe(listener1);
            mapper.subscribe(listener2);

            mapper.mapTable('fixe', 'table');

            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });

        it('should return unsubscribe function', () => {
            const listener = vi.fn();
            const unsubscribe = mapper.subscribe(listener);

            unsubscribe();
            mapper.mapTable('fixe', 'table');

            expect(listener).not.toHaveBeenCalled();
        });

        it('should continue notifying other listeners if one throws', () => {
            const badListener = vi.fn(() => { throw new Error('test'); });
            const goodListener = vi.fn();

            mapper.subscribe(badListener);
            mapper.subscribe(goodListener);

            mapper.mapTable('fixe', 'table');

            expect(goodListener).toHaveBeenCalled();
        });
    });

    describe('getUnmappedTables', () => {
        it('should return all tables when none mapped', () => {
            const result = mapper.getUnmappedTables();

            expect(result.length).toBeGreaterThan(0);
            expect(result.some(t => t.placeholder === 'fixe')).toBe(true);
        });

        it('should exclude mapped tables', () => {
            mapper.mapTable('fixe', 'my_table');

            const result = mapper.getUnmappedTables();

            expect(result.some(t => t.placeholder === 'fixe')).toBe(false);
        });

        it('should include description in returned objects', () => {
            const result = mapper.getUnmappedTables();

            expect(result[0]).toHaveProperty('placeholder');
            expect(result[0]).toHaveProperty('description');
        });
    });

    describe('clearAll', () => {
        it('should clear all mappings', () => {
            mapper.mapTable('fixe', 'table1');
            mapper.mapTable('acte', 'table2');

            mapper.clearAll();

            expect(mapper.getAllMappings()).toEqual({});
        });

        it('should notify listeners for each unmapped table', () => {
            const listener = vi.fn();
            mapper.mapTable('fixe', 'table1');
            mapper.mapTable('acte', 'table2');
            mapper.subscribe(listener);

            mapper.clearAll();

            expect(listener).toHaveBeenCalledTimes(2);
        });
    });

    describe('getExpectedTables', () => {
        it('should return table definitions from registry', () => {
            const tables = mapper.getExpectedTables();

            expect(tables).toHaveProperty('fixe');
            expect(tables.fixe).toHaveProperty('description');
        });
    });
});
