import { describe, it, expect } from 'vitest';
import { COLOR_PALETTES } from '../lib/themeConfig';

describe('themeConfig - COLOR_PALETTES', () => {
    it('should have at least 5 palettes', () => {
        expect(COLOR_PALETTES.length).toBeGreaterThanOrEqual(5);
    });

    it('every palette should have name, primary, secondary, accent', () => {
        COLOR_PALETTES.forEach(p => {
            expect(p).toHaveProperty('name');
            expect(p).toHaveProperty('primary');
            expect(p).toHaveProperty('secondary');
            expect(p).toHaveProperty('accent');
        });
    });

    it('every palette color should be a valid hex color', () => {
        const hexRegex = /^#[0-9a-fA-F]{6}$/;
        COLOR_PALETTES.forEach(p => {
            expect(p.primary).toMatch(hexRegex);
            expect(p.secondary).toMatch(hexRegex);
            expect(p.accent).toMatch(hexRegex);
        });
    });

    it('should have unique palette names', () => {
        const names = COLOR_PALETTES.map(p => p.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('should include Azul Profissional palette', () => {
        const azul = COLOR_PALETTES.find(p => p.name === 'Azul Profissional');
        expect(azul).toBeDefined();
        expect(azul!.primary).toBe('#3b82f6');
    });

    it('should include Vermelho Urgência palette', () => {
        const vermelho = COLOR_PALETTES.find(p => p.name === 'Vermelho Urgência');
        expect(vermelho).toBeDefined();
        expect(vermelho!.primary).toBe('#ef4444');
    });
});
