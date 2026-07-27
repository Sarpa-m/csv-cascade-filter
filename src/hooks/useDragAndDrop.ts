import { useState, useCallback, useRef } from 'react';

interface UseDragAndDropReturn {
  /** Items na ordem atual */
  items: string[];
  /** Item sendo arrastado no momento */
  draggedIndex: number | null;
  /** Item sobre o qual o dragged está pairando */
  dragOverIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragLeave: () => void;
  handleDrop: (index: number) => void;
  handleDragEnd: () => void;
  /** Reordena manualmente (para acessibilidade / fallback sem drag) */
  moveItem: (fromIndex: number, toIndex: number) => void;
  /** Reinicializa a lista de items (ex.: ao voltar da tela de filtros) */
  resetItems: (newItems: string[]) => void;
}

/**
 * Hook para reordenação de listas via drag-and-drop nativo do HTML5.
 */
export function useDragAndDrop(
  initialItems: string[],
  onReorder: (newOrder: string[]) => void,
): UseDragAndDropReturn {
  const [items, setItems] = useState<string[]>(initialItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const itemsRef = useRef(items);

  // Sincronizar items internos quando initialItems mudar
  if (initialItems.join(',') !== itemsRef.current.join(',')) {
    // Verifica se a ordem é realmente diferente (não apenas a mesma lista recriada)
    const currentSet = new Set(itemsRef.current);
    const newSet = new Set(initialItems);
    const sameElements =
      currentSet.size === newSet.size &&
      [...currentSet].every((v) => newSet.has(v));

    if (!sameElements) {
      itemsRef.current = initialItems;
      // Atualiza via micro-task para não setar estado durante render
      queueMicrotask(() => setItems(initialItems));
    }
  }

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (index: number) => {
      if (draggedIndex === null || draggedIndex === index) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }

      const newItems = [...items];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(index, 0, removed);

      setItems(newItems);
      itemsRef.current = newItems;
      setDraggedIndex(null);
      setDragOverIndex(null);
      onReorder(newItems);
    },
    [draggedIndex, items, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const newItems = [...items];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      setItems(newItems);
      itemsRef.current = newItems;
      onReorder(newItems);
    },
    [items, onReorder],
  );

  const resetItems = useCallback((newItems: string[]) => {
    itemsRef.current = newItems;
    setItems(newItems);
  }, []);

  return {
    items,
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    moveItem,
    resetItems,
  };
}
