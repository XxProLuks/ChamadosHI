import { describe, it, expect } from 'vitest';
import ERPConnector from '../lib/erpIntegration';

describe('erpIntegration - ERPConnector', () => {
    it('should be instantiable', () => {
        const connector = new ERPConnector();
        expect(connector).toBeDefined();
    });

    it('should have init method', () => {
        const connector = new ERPConnector();
        expect(typeof connector.init).toBe('function');
    });

    it('should have testConnection method', () => {
        const connector = new ERPConnector();
        expect(typeof connector.testConnection).toBe('function');
    });

    it('should have syncUsers method', () => {
        const connector = new ERPConnector();
        expect(typeof connector.syncUsers).toBe('function');
    });

    it('should have syncDepartments method', () => {
        const connector = new ERPConnector();
        expect(typeof connector.syncDepartments).toBe('function');
    });

    it('should have exportTicket method', () => {
        const connector = new ERPConnector();
        expect(typeof connector.exportTicket).toBe('function');
    });

    it('should have getSyncHistory method', () => {
        const connector = new ERPConnector();
        expect(typeof connector.getSyncHistory).toBe('function');
    });
});
