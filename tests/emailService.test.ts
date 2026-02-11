import { describe, it, expect } from 'vitest';
import { emailTemplates } from '../lib/emailService';

describe('emailService - emailTemplates', () => {

    describe('ticketCreated', () => {
        it('should generate email with correct subject', () => {
            const result = emailTemplates.ticketCreated('Internet Caiu', 'TK-001', 'João', 'Recepção');
            expect(result.subject).toContain('Novo Chamado');
            expect(result.subject).toContain('Internet Caiu');
        });

        it('should include all data in HTML body', () => {
            const result = emailTemplates.ticketCreated('Ar Condicionado', 'TK-002', 'Maria', 'UTI');
            expect(result.html).toContain('Ar Condicionado');
            expect(result.html).toContain('Maria');
            expect(result.html).toContain('UTI');
            expect(result.html).toContain('TK-002');
        });

        it('should include plain text fallback', () => {
            const result = emailTemplates.ticketCreated('Impressora', 'TK-003', 'Pedro', 'Farmácia');
            expect(result.text).toContain('Impressora');
            expect(result.text).toContain('Pedro');
            expect(result.text).toContain('Farmácia');
            expect(result.text).toContain('TK-003');
        });
    });

    describe('statusChanged', () => {
        it('should generate email with status change info', () => {
            const result = emailTemplates.statusChanged('Internet Caiu', 'TODO', 'IN_PROGRESS', 'Carlos');
            expect(result.subject).toContain('Status Atualizado');
            expect(result.html).toContain('TODO');
            expect(result.html).toContain('IN_PROGRESS');
            expect(result.html).toContain('Carlos');
        });

        it('should work without technician name', () => {
            const result = emailTemplates.statusChanged('Internet Caiu', 'TODO', 'DONE');
            expect(result.html).toContain('TODO');
            expect(result.html).toContain('DONE');
            expect(result.text).not.toContain('Técnico');
        });

        it('should include technician in text when provided', () => {
            const result = emailTemplates.statusChanged('Teste', 'TODO', 'DONE', 'Ana');
            expect(result.text).toContain('Ana');
        });
    });

    describe('newMessage', () => {
        it('should generate email with message preview', () => {
            const result = emailTemplates.newMessage('Chamado Rede', 'Dr. Silva', 'Pode verificar agora?');
            expect(result.subject).toContain('Nova Mensagem');
            expect(result.subject).toContain('Chamado Rede');
            expect(result.html).toContain('Dr. Silva');
            expect(result.html).toContain('Pode verificar agora?');
        });

        it('should include sender name and preview in plain text', () => {
            const result = emailTemplates.newMessage('Chamado', 'João', 'Mensagem teste');
            expect(result.text).toContain('João');
            expect(result.text).toContain('Mensagem teste');
        });
    });

    describe('ticketCompleted', () => {
        it('should generate completion email', () => {
            const result = emailTemplates.ticketCompleted('Ar Condicionado', 'Carlos');
            expect(result.subject).toContain('Concluído');
            expect(result.subject).toContain('Ar Condicionado');
            expect(result.html).toContain('Carlos');
            expect(result.html).toContain('concluído');
        });

        it('should include rating section in HTML', () => {
            const result = emailTemplates.ticketCompleted('Impressora', 'Ana');
            expect(result.html).toContain('avalie');
            expect(result.html).toContain('⭐');
        });

        it('should include plain text with technician', () => {
            const result = emailTemplates.ticketCompleted('Rede', 'Pedro');
            expect(result.text).toContain('Pedro');
            expect(result.text).toContain('avalie');
        });
    });
});
