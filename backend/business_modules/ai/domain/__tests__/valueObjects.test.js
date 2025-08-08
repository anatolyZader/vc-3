'use strict';

const UserId = require('../value_objects/userId');
const RepoId = require('../value_objects/repoId');
const Prompt = require('../value_objects/prompt');

describe('Value Objects', () => {
  describe('UserId', () => {
    test('creates valid UserId', () => {
      const id = new UserId('user-123');
      expect(id.value).toBe('user-123');
    });

    test('throws on invalid value', () => {
      expect(() => new UserId()).toThrow('Invalid UserId');
      expect(() => new UserId(123)).toThrow('Invalid UserId');
    });

    test('equality works', () => {
      const a = new UserId('u1');
      const b = new UserId('u1');
      const c = new UserId('u2');
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });
  });

  describe('RepoId', () => {
    test('creates valid RepoId', () => {
      const id = new RepoId('repo-1');
      expect(id.value).toBe('repo-1');
    });

    test('throws on invalid value', () => {
      expect(() => new RepoId()).toThrow('Invalid RepoId');
      expect(() => new RepoId(42)).toThrow('Invalid RepoId');
    });

    test('equality works', () => {
      const a = new RepoId('r1');
      const b = new RepoId('r1');
      const c = new RepoId('r2');
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });
  });

  describe('Prompt', () => {
    test('creates valid Prompt', () => {
      const p = new Prompt('hello');
      expect(p.text).toBe('hello');
    });

    test('throws on invalid text', () => {
      expect(() => new Prompt()).toThrow('Invalid Prompt');
      expect(() => new Prompt(123)).toThrow('Invalid Prompt');
      expect(() => new Prompt('')).toThrow('Invalid Prompt');
    });

    test('equality works', () => {
      const a = new Prompt('same');
      const b = new Prompt('same');
      const c = new Prompt('diff');
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });
  });
});
