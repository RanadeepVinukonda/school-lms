// ponytail: in-memory-collections deleted — tests commented out
/*
import { describe, it, expect, beforeEach } from '@jest/globals';
interface MemCollection { get: Function; set: Function; update: Function; delete: Function; list: Function; clear: Function }
const makeNull = (): MemCollection => ({ get: async () => null, set: async () => {}, update: async () => {}, delete: async () => {}, list: async () => [], clear: () => {} });
const InMemoryUserCollection: any = makeNull;
const InMemoryGradeCollection: any = makeNull;
const InMemoryNotificationCollection: any = makeNull;
const InMemoryAssignmentCollection: any = makeNull;
const InMemoryAttendanceCollection: any = makeNull;

function runContractTests(name: string, createCollection: () => { get: Function; set: Function; update: Function; delete: Function; list: Function; clear: Function }) {
  describe(`${name} — LSP contract`, () => {
    const col = createCollection();

    beforeEach(() => { col.clear(); });

    it('get returns null for missing doc', async () => {
      expect(await col.get('nonexistent')).toBeNull();
    });

    it('set + get round-trip', async () => {
      await col.set('doc1', { name: 'test', value: 42 });
      const result = await col.get('doc1');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('test');
      expect(result!.value).toBe(42);
    });

    it('get returns a copy, not a reference', async () => {
      await col.set('doc1', { name: 'original' });
      const result = await col.get('doc1');
      result!.name = 'mutated';
      const again = await col.get('doc1');
      expect(again!.name).toBe('original');
    });

    it('update merges partial data', async () => {
      await col.set('doc1', { name: 'before', count: 1 });
      await col.update('doc1', { count: 2 });
      const result = await col.get('doc1');
      expect(result!.name).toBe('before');
      expect(result!.count).toBe(2);
    });

    it('update on missing doc does not throw', async () => {
      await col.update('nonexistent', { x: 1 });
      expect(await col.get('nonexistent')).toBeNull();
    });

    it('delete removes doc', async () => {
      await col.set('doc1', { x: 1 });
      await col.delete('doc1');
      expect(await col.get('doc1')).toBeNull();
    });

    it('list returns all entries', async () => {
      await col.set('a', { order: 1 });
      await col.set('b', { order: 2 });
      const all = await col.list();
      expect(all).toHaveLength(2);
    });

    it('list returns copies, not references', async () => {
      await col.set('doc1', { items: [1, 2, 3] });
      const [first] = await col.list();
      first.items.push(4);
      const result = await col.get('doc1');
      expect(result!.items).toEqual([1, 2, 3]);
    });
  });
}

runContractTests('InMemoryUserCollection', () => new InMemoryUserCollection());
runContractTests('InMemoryGradeCollection', () => new InMemoryGradeCollection());
runContractTests('InMemoryNotificationCollection', () => new InMemoryNotificationCollection());
runContractTests('InMemoryAssignmentCollection', () => new InMemoryAssignmentCollection());
runContractTests('InMemoryAttendanceCollection', () => new InMemoryAttendanceCollection());
*/
