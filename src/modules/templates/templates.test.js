/**
 * Tests for templates.js
 */
import { describe, it, expect } from 'vitest';
import {
    CATEGORIES,
    getTemplatesForPalette,
    getAllTemplatesWithStatus,
    getTemplatesByCategory,
    searchTemplates,
    getExpectedTablesWithCounts,
    getAvailabilitySummary
} from './templates.js';

describe('templates', () => {
    describe('CATEGORIES', () => {
        it('should be an array of category objects', () => {
            expect(Array.isArray(CATEGORIES)).toBe(true);
            expect(CATEGORIES.length).toBeGreaterThan(0);
        });

        it('should have id and label for each category', () => {
            for (const category of CATEGORIES) {
                expect(category).toHaveProperty('id');
                expect(category).toHaveProperty('label');
            }
        });
    });

    describe('getTemplatesForPalette', () => {
        it('should return empty array when no tables mapped', () => {
            const result = getTemplatesForPalette(new Set());

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        it('should return templates when dependencies are satisfied', () => {
            const result = getTemplatesForPalette(new Set(['fixe']));

            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('title');
            expect(result[0]).toHaveProperty('sql');
        });

        it('should accept array instead of Set', () => {
            const result = getTemplatesForPalette(['fixe']);

            expect(result.length).toBeGreaterThan(0);
        });

        it('should mark all returned templates as available', () => {
            const result = getTemplatesForPalette(['fixe']);

            for (const template of result) {
                expect(template.available).toBe(true);
            }
        });

        it('should include depends_on in template objects', () => {
            const result = getTemplatesForPalette(['fixe']);

            expect(result[0]).toHaveProperty('depends_on');
            expect(Array.isArray(result[0].depends_on)).toBe(true);
        });
    });

    describe('getAllTemplatesWithStatus', () => {
        it('should return all templates with availability status', () => {
            const result = getAllTemplatesWithStatus(new Set());

            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('available');
            expect(result[0]).toHaveProperty('missingDependencies');
        });

        it('should mark templates with missing dependencies as unavailable', () => {
            const result = getAllTemplatesWithStatus(new Set());

            const unavailable = result.filter(t => !t.available);
            expect(unavailable.length).toBeGreaterThan(0);

            for (const template of unavailable) {
                expect(template.missingDependencies.length).toBeGreaterThan(0);
            }
        });

        it('should mark templates with all dependencies as available', () => {
            const result = getAllTemplatesWithStatus(new Set(['fixe']));

            const available = result.filter(t => t.available);
            expect(available.length).toBeGreaterThan(0);

            for (const template of available) {
                expect(template.missingDependencies.length).toBe(0);
            }
        });

        it('should include SQL invocation for all templates', () => {
            const result = getAllTemplatesWithStatus(new Set());

            for (const template of result) {
                expect(template.sql).toContain('SELECT');
                expect(template.sql).toContain(template.id);
            }
        });
    });

    describe('getTemplatesByCategory', () => {
        it('should group templates by category', () => {
            const result = getTemplatesByCategory(['fixe']);

            expect(typeof result).toBe('object');
            expect(result.casemix).toBeDefined();
            expect(result.casemix).toHaveProperty('templates');
        });

        it('should include category metadata', () => {
            const result = getTemplatesByCategory(['fixe']);

            expect(result.casemix).toHaveProperty('label');
            expect(result.casemix).toHaveProperty('id');
        });

        it('should only include available templates by default', () => {
            const result = getTemplatesByCategory(new Set());

            // With no tables mapped, all template arrays should be empty
            for (const category of Object.values(result)) {
                expect(category.templates.length).toBe(0);
            }
        });

        it('should include unavailable templates when requested', () => {
            const result = getTemplatesByCategory(new Set(), true);

            // Should have at least one template in some category
            const totalTemplates = Object.values(result)
                .reduce((sum, cat) => sum + cat.templates.length, 0);
            expect(totalTemplates).toBeGreaterThan(0);
        });
    });

    describe('searchTemplates', () => {
        it('should return all templates when query is empty', () => {
            const all = getTemplatesForPalette(['fixe']);
            const result = searchTemplates('', ['fixe']);

            expect(result.length).toBe(all.length);
        });

        it('should filter by title', () => {
            const result = searchTemplates('casemix', ['fixe']);

            expect(result.length).toBeGreaterThan(0);
            for (const template of result) {
                expect(
                    template.title.toLowerCase().includes('casemix') ||
                    template.description.toLowerCase().includes('casemix') ||
                    template.id.toLowerCase().includes('casemix')
                ).toBe(true);
            }
        });

        it('should filter by description', () => {
            const result = searchTemplates('GHM', ['fixe']);

            expect(result.length).toBeGreaterThan(0);
        });

        it('should be case-insensitive', () => {
            const lower = searchTemplates('casemix', ['fixe']);
            const upper = searchTemplates('CASEMIX', ['fixe']);

            expect(lower.length).toBe(upper.length);
        });

        it('should include unavailable templates when requested', () => {
            const available = searchTemplates('casemix', new Set(), false);
            const all = searchTemplates('casemix', new Set(), true);

            expect(all.length).toBeGreaterThanOrEqual(available.length);
        });

        it('should handle null/undefined query', () => {
            const result1 = searchTemplates(null, ['fixe']);
            const result2 = searchTemplates(undefined, ['fixe']);

            expect(Array.isArray(result1)).toBe(true);
            expect(Array.isArray(result2)).toBe(true);
        });

        it('should filter by category', () => {
            const result = searchTemplates('casemix', ['fixe']);

            for (const template of result) {
                expect(
                    template.category.includes('casemix') ||
                    template.title.toLowerCase().includes('casemix') ||
                    template.description.toLowerCase().includes('casemix')
                ).toBe(true);
            }
        });
    });

    describe('getExpectedTablesWithCounts', () => {
        it('should return array of table info', () => {
            const result = getExpectedTablesWithCounts(new Set());

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should include template count for each table', () => {
            const result = getExpectedTablesWithCounts(new Set());

            for (const table of result) {
                expect(table).toHaveProperty('templateCount');
                expect(typeof table.templateCount).toBe('number');
            }
        });

        it('should indicate mapped status', () => {
            const result = getExpectedTablesWithCounts(new Set(['fixe']));

            const fixe = result.find(t => t.placeholder === 'fixe');
            expect(fixe.isMapped).toBe(true);

            const unmapped = result.find(t => t.placeholder !== 'fixe');
            if (unmapped) {
                expect(unmapped.isMapped).toBe(false);
            }
        });

        it('should include description and category', () => {
            const result = getExpectedTablesWithCounts(new Set());

            for (const table of result) {
                expect(table).toHaveProperty('description');
                expect(table).toHaveProperty('placeholder');
            }
        });
    });

    describe('getAvailabilitySummary', () => {
        it('should return availability statistics', () => {
            const result = getAvailabilitySummary(new Set());

            expect(result).toHaveProperty('available');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('percentage');
        });

        it('should show 0 available when no tables mapped', () => {
            const result = getAvailabilitySummary(new Set());

            expect(result.available).toBe(0);
            expect(result.percentage).toBe(0);
        });

        it('should show increased availability when tables mapped', () => {
            const withoutFixe = getAvailabilitySummary(new Set());
            const withFixe = getAvailabilitySummary(new Set(['fixe']));

            expect(withFixe.available).toBeGreaterThan(withoutFixe.available);
            expect(withFixe.percentage).toBeGreaterThan(withoutFixe.percentage);
        });

        it('should calculate percentage correctly', () => {
            const result = getAvailabilitySummary(new Set(['fixe']));

            const expectedPercentage = Math.round((result.available / result.total) * 100);
            expect(result.percentage).toBe(expectedPercentage);
        });
    });
});
