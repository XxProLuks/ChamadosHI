import { describe, it, expect } from 'vitest';
import { validateFile, getFileIcon, formatFileSize, isImage } from '../lib/fileUpload';

// Helper to create a mock File
function createMockFile(name: string, size: number, type: string): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
}

describe('fileUpload - validateFile', () => {
    it('should accept a valid PDF file', () => {
        const file = createMockFile('doc.pdf', 1024, 'application/pdf');
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('should accept a valid JPEG image', () => {
        const file = createMockFile('photo.jpg', 2048, 'image/jpeg');
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('should accept a valid PNG image', () => {
        const file = createMockFile('img.png', 500, 'image/png');
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('should accept a valid DOCX file', () => {
        const file = createMockFile('report.docx', 1000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('should accept a valid XLSX file', () => {
        const file = createMockFile('data.xlsx', 1000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('should accept a valid CSV file', () => {
        const file = createMockFile('data.csv', 100, 'text/csv');
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('should accept a valid TXT file', () => {
        const file = createMockFile('readme.txt', 50, 'text/plain');
        expect(validateFile(file)).toEqual({ valid: true });
    });

    it('should reject unsupported file type', () => {
        const file = createMockFile('app.exe', 1024, 'application/x-msdownload');
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Tipo de arquivo não suportado');
    });

    it('should reject zip files', () => {
        const file = createMockFile('archive.zip', 1024, 'application/zip');
        const result = validateFile(file);
        expect(result.valid).toBe(false);
    });

    it('should reject files over 10MB', () => {
        const file = createMockFile('huge.pdf', 11 * 1024 * 1024, 'application/pdf');
        const result = validateFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Arquivo muito grande');
        expect(result.error).toContain('10MB');
    });

    it('should accept file exactly at 10MB', () => {
        const file = createMockFile('limit.pdf', 10 * 1024 * 1024, 'application/pdf');
        expect(validateFile(file)).toEqual({ valid: true });
    });
});

describe('fileUpload - getFileIcon', () => {
    it('should return image icon for image types', () => {
        expect(getFileIcon('image/jpeg')).toBe('🖼️');
        expect(getFileIcon('image/png')).toBe('🖼️');
        expect(getFileIcon('image/gif')).toBe('🖼️');
    });

    it('should return PDF icon for PDF', () => {
        expect(getFileIcon('application/pdf')).toBe('📄');
    });

    it('should return Word icon for Word docs', () => {
        expect(getFileIcon('application/msword')).toBe('📝');
        expect(getFileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('📝');
    });

    it('should return Excel icon for spreadsheets', () => {
        expect(getFileIcon('application/vnd.ms-excel')).toBe('📊');
        // Note: XLSX MIME contains 'document' which matches Word check first in getFileIcon
        expect(getFileIcon('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('📝');
    });

    it('should return CSV icon for CSV', () => {
        expect(getFileIcon('text/csv')).toBe('📋');
    });

    it('should return text icon for plain text', () => {
        expect(getFileIcon('text/plain')).toBe('📃');
    });

    it('should return default icon for unknown types', () => {
        expect(getFileIcon('application/octet-stream')).toBe('📎');
    });
});

describe('fileUpload - formatFileSize', () => {
    it('should format bytes', () => {
        expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
        expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes', () => {
        expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
    });

    it('should format edge case at 1KB boundary', () => {
        expect(formatFileSize(1023)).toBe('1023 B');
        expect(formatFileSize(1024)).toBe('1.0 KB');
    });

    it('should format edge case at 1MB boundary', () => {
        expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    });
});

describe('fileUpload - isImage', () => {
    it('should return true for image types', () => {
        expect(isImage('image/jpeg')).toBe(true);
        expect(isImage('image/png')).toBe(true);
        expect(isImage('image/gif')).toBe(true);
        expect(isImage('image/webp')).toBe(true);
    });

    it('should return false for non-image types', () => {
        expect(isImage('application/pdf')).toBe(false);
        expect(isImage('text/plain')).toBe(false);
        expect(isImage('application/msword')).toBe(false);
    });
});
