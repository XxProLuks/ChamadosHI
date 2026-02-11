import { describe, it, expect } from 'vitest';
import {
    ALERT_TEMPLATES,
    getTemplateById,
    fillTemplatePlaceholders
} from '../lib/alertTemplates';

describe('alertTemplates - ALERT_TEMPLATES', () => {
    it('should have at least 5 templates', () => {
        expect(ALERT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    });

    it('every template should have required fields', () => {
        ALERT_TEMPLATES.forEach(t => {
            expect(t).toHaveProperty('id');
            expect(t).toHaveProperty('name');
            expect(t).toHaveProperty('message');
            expect(t).toHaveProperty('type');
            expect(t).toHaveProperty('defaultDuration');
            expect(t).toHaveProperty('icon');
            expect(['INFO', 'WARNING', 'CRITICAL']).toContain(t.type);
            expect(t.defaultDuration).toBeGreaterThan(0);
        });
    });

    it('should have unique ids', () => {
        const ids = ALERT_TEMPLATES.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('should include a custom template', () => {
        const custom = ALERT_TEMPLATES.find(t => t.id === 'custom');
        expect(custom).toBeDefined();
        expect(custom!.message).toBe('');
    });
});

describe('alertTemplates - getTemplateById', () => {
    it('should find existing template', () => {
        const template = getTemplateById('maintenance');
        expect(template).toBeDefined();
        expect(template!.id).toBe('maintenance');
        expect(template!.type).toBe('WARNING');
    });

    it('should return undefined for non-existent template', () => {
        expect(getTemplateById('does_not_exist')).toBeUndefined();
    });

    it('should find all templates by their ids', () => {
        ALERT_TEMPLATES.forEach(t => {
            expect(getTemplateById(t.id)).toBeDefined();
        });
    });
});

describe('alertTemplates - fillTemplatePlaceholders', () => {
    it('should replace a single placeholder', () => {
        const template = getTemplateById('maintenance')!;
        const result = fillTemplatePlaceholders(template, { 'HORÁRIO': '14:00' });
        expect(result).toContain('14:00');
        expect(result).not.toContain('[HORÁRIO]');
    });

    it('should replace multiple placeholders', () => {
        const template = getTemplateById('meeting')!;
        const result = fillTemplatePlaceholders(template, {
            'HORÁRIO': '10:00',
            'LOCAL': 'Auditório'
        });
        expect(result).toContain('10:00');
        expect(result).toContain('Auditório');
        expect(result).not.toContain('[HORÁRIO]');
        expect(result).not.toContain('[LOCAL]');
    });

    it('should keep placeholder text when value not provided', () => {
        const template = getTemplateById('maintenance')!;
        const result = fillTemplatePlaceholders(template, {});
        expect(result).toContain('[HORÁRIO]');
    });

    it('should handle template with no placeholders', () => {
        const template = getTemplateById('custom')!;
        const result = fillTemplatePlaceholders(template, {});
        expect(result).toBe('');
    });

    it('should replace three placeholders (training template)', () => {
        const template = getTemplateById('training')!;
        const result = fillTemplatePlaceholders(template, {
            'TEMA': 'Segurança Digital',
            'DATA': '15/03',
            'PRAZO': '10/03'
        });
        expect(result).toContain('Segurança Digital');
        expect(result).toContain('15/03');
        expect(result).toContain('10/03');
    });
});
