/**
 * Tests for macro-generator.js
 */
import { describe, it, expect } from 'vitest';
import {
    generateMacroSQL,
    generateMacroInvocation,
    extractPlaceholders,
    validateMacroMappings
} from './macro-generator.js';

describe('macro-generator', () => {
    describe('generateMacroSQL', () => {
        it('should generate CREATE MACRO SQL with table placeholder replaced', () => {
            const macro = {
                id: 'get_casemix',
                sqlTemplate: 'SELECT ghm2, COUNT(*) FROM {{fixe}} GROUP BY ghm2',
                depends_on: ['fixe'],
                parameters: []
            };
            const tableMappings = { fixe: 'my_fixe_table' };

            const result = generateMacroSQL(macro, tableMappings);

            expect(result).toContain('CREATE OR REPLACE MACRO get_casemix()');
            expect(result).toContain('FROM my_fixe_table');
            expect(result).not.toContain('{{fixe}}');
        });

        it('should handle multiple table placeholders', () => {
            const macro = {
                id: 'get_combined',
                sqlTemplate: 'SELECT * FROM {{fixe}} f JOIN {{acte}} a ON f.id = a.id',
                depends_on: ['fixe', 'acte'],
                parameters: []
            };
            const tableMappings = {
                fixe: 'sejours',
                acte: 'procedures'
            };

            const result = generateMacroSQL(macro, tableMappings);

            expect(result).toContain('FROM sejours f JOIN procedures a');
            expect(result).not.toContain('{{fixe}}');
            expect(result).not.toContain('{{acte}}');
        });

        it('should include parameters in macro signature', () => {
            const macro = {
                id: 'get_top_n',
                sqlTemplate: 'SELECT * FROM {{fixe}} LIMIT n',
                depends_on: ['fixe'],
                parameters: [
                    { name: 'n', type: 'integer', default: 10 }
                ]
            };
            const tableMappings = { fixe: 'data' };

            const result = generateMacroSQL(macro, tableMappings);

            expect(result).toContain('CREATE OR REPLACE MACRO get_top_n(n)');
        });

        it('should handle multiple parameters', () => {
            const macro = {
                id: 'get_filtered',
                sqlTemplate: 'SELECT * FROM {{fixe}} WHERE year = year AND month = month',
                depends_on: ['fixe'],
                parameters: [
                    { name: 'year', type: 'integer' },
                    { name: 'month', type: 'integer' }
                ]
            };
            const tableMappings = { fixe: 'data' };

            const result = generateMacroSQL(macro, tableMappings);

            expect(result).toContain('CREATE OR REPLACE MACRO get_filtered(year, month)');
        });

        it('should remove SQL comments from template', () => {
            const macro = {
                id: 'get_test',
                sqlTemplate: '-- This is a comment\nSELECT * FROM {{fixe}}\n-- Another comment',
                depends_on: ['fixe'],
                parameters: []
            };
            const tableMappings = { fixe: 'data' };

            const result = generateMacroSQL(macro, tableMappings);

            expect(result).not.toContain('-- This is a comment');
            expect(result).not.toContain('-- Another comment');
            expect(result).toContain('SELECT * FROM data');
        });

        it('should handle empty parameters array', () => {
            const macro = {
                id: 'get_all',
                sqlTemplate: 'SELECT * FROM {{fixe}}',
                depends_on: ['fixe'],
                parameters: []
            };
            const tableMappings = { fixe: 'data' };

            const result = generateMacroSQL(macro, tableMappings);

            expect(result).toContain('get_all()');
        });

        it('should handle undefined parameters', () => {
            const macro = {
                id: 'get_all',
                sqlTemplate: 'SELECT * FROM {{fixe}}',
                depends_on: ['fixe']
                // parameters is undefined
            };
            const tableMappings = { fixe: 'data' };

            const result = generateMacroSQL(macro, tableMappings);

            expect(result).toContain('get_all()');
        });
    });

    describe('generateMacroInvocation', () => {
        it('should generate SELECT * FROM macro() for parameterless macro', () => {
            const macro = {
                id: 'get_casemix',
                parameters: []
            };

            const result = generateMacroInvocation(macro);

            expect(result).toBe('SELECT * FROM get_casemix()');
        });

        it('should include default values for parameters', () => {
            const macro = {
                id: 'get_top_n',
                parameters: [
                    { name: 'n', type: 'integer', default: 10 }
                ]
            };

            const result = generateMacroInvocation(macro);

            expect(result).toBe('SELECT * FROM get_top_n(10)');
        });

        it('should use placeholder for parameters without defaults', () => {
            const macro = {
                id: 'get_by_year',
                parameters: [
                    { name: 'year', type: 'integer' }
                ]
            };

            const result = generateMacroInvocation(macro);

            expect(result).toBe('SELECT * FROM get_by_year({year})');
        });

        it('should handle mixed parameters with and without defaults', () => {
            const macro = {
                id: 'get_filtered',
                parameters: [
                    { name: 'year', type: 'integer' },
                    { name: 'limit', type: 'integer', default: 100 }
                ]
            };

            const result = generateMacroInvocation(macro);

            expect(result).toBe('SELECT * FROM get_filtered({year}, 100)');
        });

        it('should handle undefined parameters', () => {
            const macro = {
                id: 'get_all'
                // parameters is undefined
            };

            const result = generateMacroInvocation(macro);

            expect(result).toBe('SELECT * FROM get_all()');
        });
    });

    describe('extractPlaceholders', () => {
        it('should extract single placeholder', () => {
            const sql = 'SELECT * FROM {{fixe}}';

            const result = extractPlaceholders(sql);

            expect(result).toEqual(['fixe']);
        });

        it('should extract multiple unique placeholders', () => {
            const sql = 'SELECT * FROM {{fixe}} f JOIN {{acte}} a ON f.id = a.id';

            const result = extractPlaceholders(sql);

            expect(result).toContain('fixe');
            expect(result).toContain('acte');
            expect(result).toHaveLength(2);
        });

        it('should not duplicate placeholders used multiple times', () => {
            const sql = 'SELECT * FROM {{fixe}} WHERE id IN (SELECT id FROM {{fixe}})';

            const result = extractPlaceholders(sql);

            expect(result).toEqual(['fixe']);
        });

        it('should return empty array for SQL without placeholders', () => {
            const sql = 'SELECT * FROM some_table';

            const result = extractPlaceholders(sql);

            expect(result).toEqual([]);
        });

        it('should handle placeholders with underscores', () => {
            const sql = 'SELECT * FROM {{fixe_2024}} f JOIN {{acte_data}} a';

            const result = extractPlaceholders(sql);

            expect(result).toContain('fixe_2024');
            expect(result).toContain('acte_data');
        });
    });

    describe('validateMacroMappings', () => {
        it('should return valid when all dependencies are mapped', () => {
            const macro = {
                id: 'get_casemix',
                depends_on: ['fixe']
            };
            const tableMappings = { fixe: 'my_table' };

            const result = validateMacroMappings(macro, tableMappings);

            expect(result.valid).toBe(true);
            expect(result.missing).toEqual([]);
        });

        it('should return invalid with missing dependencies', () => {
            const macro = {
                id: 'get_combined',
                depends_on: ['fixe', 'acte']
            };
            const tableMappings = { fixe: 'my_table' };

            const result = validateMacroMappings(macro, tableMappings);

            expect(result.valid).toBe(false);
            expect(result.missing).toEqual(['acte']);
        });

        it('should return all missing dependencies', () => {
            const macro = {
                id: 'get_complex',
                depends_on: ['fixe', 'acte', 'diag']
            };
            const tableMappings = {};

            const result = validateMacroMappings(macro, tableMappings);

            expect(result.valid).toBe(false);
            expect(result.missing).toContain('fixe');
            expect(result.missing).toContain('acte');
            expect(result.missing).toContain('diag');
            expect(result.missing).toHaveLength(3);
        });

        it('should handle empty depends_on', () => {
            const macro = {
                id: 'get_constant',
                depends_on: []
            };
            const tableMappings = {};

            const result = validateMacroMappings(macro, tableMappings);

            expect(result.valid).toBe(true);
            expect(result.missing).toEqual([]);
        });
    });
});
