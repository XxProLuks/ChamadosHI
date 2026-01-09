export interface AlertTemplate {
    id: string;
    name: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'CRITICAL';
    defaultDuration: number; // in hours
    icon: string;
    placeholders?: string[];
}

export const ALERT_TEMPLATES: AlertTemplate[] = [
    {
        id: 'maintenance',
        name: '🔧 Manutenção Programada',
        message: 'Sistema em manutenção programada. Retorno previsto para [HORÁRIO].',
        type: 'WARNING',
        defaultDuration: 2,
        icon: '🔧',
        placeholders: ['HORÁRIO']
    },
    {
        id: 'emergency',
        name: '🚨 Emergência Médica',
        message: 'ATENÇÃO: Situação de emergência no setor [SETOR]. Equipes devem se apresentar imediatamente.',
        type: 'CRITICAL',
        defaultDuration: 1,
        icon: '🚨',
        placeholders: ['SETOR']
    },
    {
        id: 'system_down',
        name: '⚠️ Sistema Indisponível',
        message: 'O sistema [SISTEMA] está temporariamente indisponível. Equipe técnica trabalhando na resolução.',
        type: 'CRITICAL',
        defaultDuration: 1,
        icon: '⚠️',
        placeholders: ['SISTEMA']
    },
    {
        id: 'meeting',
        name: '📢 Reunião Geral',
        message: 'Reunião geral convocada para [HORÁRIO] no [LOCAL]. Presença obrigatória.',
        type: 'INFO',
        defaultDuration: 4,
        icon: '📢',
        placeholders: ['HORÁRIO', 'LOCAL']
    },
    {
        id: 'update',
        name: 'ℹ️ Atualização do Sistema',
        message: 'Nova versão do sistema disponível. Principais melhorias: [DETALHES]',
        type: 'INFO',
        defaultDuration: 24,
        icon: 'ℹ️',
        placeholders: ['DETALHES']
    },
    {
        id: 'training',
        name: '📚 Treinamento',
        message: 'Treinamento sobre [TEMA] agendado para [DATA]. Inscrições até [PRAZO].',
        type: 'INFO',
        defaultDuration: 72,
        icon: '📚',
        placeholders: ['TEMA', 'DATA', 'PRAZO']
    },
    {
        id: 'power_outage',
        name: '⚡ Falta de Energia',
        message: 'Possível interrupção de energia no [LOCAL] entre [INÍCIO] e [FIM]. Geradores em standby.',
        type: 'WARNING',
        defaultDuration: 3,
        icon: '⚡',
        placeholders: ['LOCAL', 'INÍCIO', 'FIM']
    },
    {
        id: 'custom',
        name: '✏️ Mensagem Personalizada',
        message: '',
        type: 'INFO',
        defaultDuration: 8,
        icon: '✏️',
        placeholders: []
    }
];

export function getTemplateById(id: string): AlertTemplate | undefined {
    return ALERT_TEMPLATES.find(t => t.id === id);
}

export function fillTemplatePlaceholders(template: AlertTemplate, values: Record<string, string>): string {
    let message = template.message;

    if (template.placeholders) {
        template.placeholders.forEach(placeholder => {
            const value = values[placeholder] || `[${placeholder}]`;
            message = message.replace(`[${placeholder}]`, value);
        });
    }

    return message;
}
