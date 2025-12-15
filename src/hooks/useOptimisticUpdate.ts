/**
 * useOptimisticUpdate Hook
 * Implement optimistic UI updates for better perceived performance
 */

import { useState, useCallback } from 'react';

export function useOptimisticUpdate<T>(initialData: T[]) {
  const [data, setData] = useState<T[]>(initialData);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const optimisticAdd = useCallback((item: T, idKey: keyof T = 'id' as keyof T) => {
    setData((prev) => [item, ...prev]);
    setPendingIds((prev) => new Set(prev).add(String(item[idKey])));
    return item;
  }, []);

  const optimisticUpdate = useCallback((id: string, updates: Partial<T>, idKey: keyof T = 'id' as keyof T) => {
    setData((prev) =>
      prev.map((item) =>
        String(item[idKey]) === id ? { ...item, ...updates } : item
      )
    );
    setPendingIds((prev) => new Set(prev).add(id));
  }, []);

  const optimisticDelete = useCallback((id: string, idKey: keyof T = 'id' as keyof T) => {
    setData((prev) => prev.filter((item) => String(item[idKey]) !== id));
    setPendingIds((prev) => new Set(prev).add(id));
  }, []);

  const confirmUpdate = useCallback((id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const rollback = useCallback((originalData: T[]) => {
    setData(originalData);
    setPendingIds(new Set());
  }, []);

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  return {
    data,
    setData,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete,
    confirmUpdate,
    rollback,
    isPending,
  };
}

