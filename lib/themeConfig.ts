import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

export interface ThemeConfig {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    systemName: string;
    logoUrl: string | null;
    darkMode: boolean;
}

export interface BrandingConfig {
    hospitalName: string;
    supportEmail: string;
    footerText: string;
}

const DEFAULT_THEME: ThemeConfig = {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b',
    accentColor: '#f59e0b',
    systemName: 'Sistema de Chamados',
    logoUrl: null,
    darkMode: false
};

const DEFAULT_BRANDING: BrandingConfig = {
    hospitalName: 'Hospital de Ilhéus',
    supportEmail: 'suporte@hospital.com',
    footerText: '© 2025 Hospital de Ilhéus - Todos os direitos reservados'
};

/**
 * Hook to access and manage theme configuration
 */
export function useTheme() {
    const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
    const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
    const [loading, setLoading] = useState(true);

    // Fetch theme from database
    const fetchTheme = useCallback(async () => {
        try {
            const { data: themeData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'theme')
                .single();

            const { data: brandingData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'branding')
                .single();

            if (themeData?.value) {
                setTheme({ ...DEFAULT_THEME, ...themeData.value });
            }
            if (brandingData?.value) {
                setBranding({ ...DEFAULT_BRANDING, ...brandingData.value });
            }
        } catch (error) {
            console.error('Error fetching theme:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Apply theme to CSS variables
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--secondary-color', theme.secondaryColor);
        root.style.setProperty('--accent-color', theme.accentColor);

        if (theme.darkMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [theme]);

    // Initial fetch
    useEffect(() => {
        fetchTheme();
    }, [fetchTheme]);

    // Update theme in database
    const updateTheme = async (newTheme: Partial<ThemeConfig>): Promise<boolean> => {
        try {
            const updatedTheme = { ...theme, ...newTheme };

            const { error } = await supabase
                .from('system_settings')
                .update({
                    value: updatedTheme,
                    updated_at: new Date().toISOString()
                })
                .eq('key', 'theme');

            if (error) throw error;

            setTheme(updatedTheme);
            toast.success('Tema atualizado!');
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao atualizar tema: ' + msg);
            return false;
        }
    };

    // Update branding in database
    const updateBranding = async (newBranding: Partial<BrandingConfig>): Promise<boolean> => {
        try {
            const updatedBranding = { ...branding, ...newBranding };

            const { error } = await supabase
                .from('system_settings')
                .update({
                    value: updatedBranding,
                    updated_at: new Date().toISOString()
                })
                .eq('key', 'branding');

            if (error) throw error;

            setBranding(updatedBranding);
            toast.success('Configurações de marca atualizadas!');
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao atualizar marca: ' + msg);
            return false;
        }
    };

    return {
        theme,
        branding,
        loading,
        updateTheme,
        updateBranding,
        refreshTheme: fetchTheme
    };
}

/**
 * Predefined color palettes for quick theme selection
 */
export const COLOR_PALETTES = [
    {
        name: 'Azul Profissional',
        primary: '#3b82f6',
        secondary: '#1e293b',
        accent: '#f59e0b'
    },
    {
        name: 'Verde Hospitalar',
        primary: '#10b981',
        secondary: '#1e293b',
        accent: '#3b82f6'
    },
    {
        name: 'Roxo Moderno',
        primary: '#8b5cf6',
        secondary: '#1e1b4b',
        accent: '#ec4899'
    },
    {
        name: 'Vermelho Urgência',
        primary: '#ef4444',
        secondary: '#1e293b',
        accent: '#fbbf24'
    },
    {
        name: 'Azul Escuro',
        primary: '#1e40af',
        secondary: '#0f172a',
        accent: '#06b6d4'
    },
    {
        name: 'Turquesa',
        primary: '#14b8a6',
        secondary: '#134e4a',
        accent: '#f97316'
    }
];

export default useTheme;
