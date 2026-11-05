import { describe, it, expect } from '@jest/globals';
import {
  CATEGORIES,
  typeToCategory,
  categoryToChannelId,
  collapseKeyFor,
} from '../services/push.mappings';

describe('push.mappings', () => {
  it('contains all canonical categories', () => {
    expect(CATEGORIES).toContain('assignments');
    expect(CATEGORIES).toContain('attendance');
    expect(CATEGORIES).toContain('exams');
    expect(CATEGORIES).toContain('general');
  });

  it('maps known types to their category', () => {
    expect(typeToCategory('assignment')).toBe('assignments');
    expect(typeToCategory('quiz')).toBe('quizzes');
    expect(typeToCategory('grade')).toBe('results');
    expect(typeToCategory('fee_reminder')).toBe('fee');
    expect(typeToCategory('notice')).toBe('notice');
    expect(typeToCategory('login')).toBe('login');
    expect(typeToCategory('report')).toBe('reports');
  });

  it('maps unknown types to general', () => {
    expect(typeToCategory('completely_unknown_xyz')).toBe('general');
    expect(typeToCategory('')).toBe('general');
  });

  it('is case-insensitive', () => {
    expect(typeToCategory('ASSIGNMENT')).toBe('assignments');
    expect(typeToCategory('  Quiz  ')).toBe('quizzes');
  });

  it('returns category as channel id', () => {
    expect(categoryToChannelId('assignments')).toBe('assignments');
  });

  it('builds collapse keys only when an entity id exists', () => {
    expect(collapseKeyFor('assignment', 'a1')).toBe('g:assignments:a1');
    expect(collapseKeyFor('assignment', 42)).toBe('g:assignments:42');
    expect(collapseKeyFor('assignment')).toBeUndefined();
    expect(collapseKeyFor('assignment', null)).toBeUndefined();
  });
});
