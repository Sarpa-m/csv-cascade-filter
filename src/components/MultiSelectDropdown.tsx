import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, Check, Lock, Zap, Layers } from 'lucide-react';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onConfirm: (values: string[]) => void;
  disabled?: boolean;
  autoFilled?: boolean;
  locked?: boolean;
  multiSelectEnabled?: boolean;
  onToggleMultiSelect?: () => void;
  label: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selected,
  onConfirm,
  disabled = false,
  autoFilled = false,
  locked = false,
  multiSelectEnabled = false,
  onToggleMultiSelect,
  label,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSelected(new Set(selected));
  }, [selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lower));
  }, [options, search]);

  const toggleValue = useCallback(
    (value: string) => {
      if (multiSelectEnabled) {
        setLocalSelected((prev) => {
          const next = new Set(prev);
          if (next.has(value)) {
            next.delete(value);
          } else {
            next.add(value);
          }
          return next;
        });
      } else {
        onConfirm([value]);
        setOpen(false);
        setSearch('');
      }
    },
    [multiSelectEnabled, onConfirm],
  );

  const selectAllVisible = useCallback(() => {
    if (!multiSelectEnabled) return;
    setLocalSelected((prev) => {
      const next = new Set(prev);
      for (const o of filteredOptions) {
        next.add(o);
      }
      return next;
    });
  }, [filteredOptions, multiSelectEnabled]);

  const clearSelection = useCallback(() => {
    setLocalSelected(new Set());
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(localSelected));
    setOpen(false);
    setSearch('');
  }, [localSelected, onConfirm]);

  const displayText = (() => {
    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0];
    return `${selected.length} selecionados`;
  })();

  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {locked && (
          <span title="Travada">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
          </span>
        )}
        {autoFilled && (
          <span title="Preenchimento automático">
            <Zap className="w-3.5 h-3.5 text-blue-500" />
          </span>
        )}
        {multiSelectEnabled && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 font-medium">
            Multi
          </span>
        )}
      </div>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all duration-200',
          disabled && 'bg-muted text-muted-foreground cursor-not-allowed border-border',
          !disabled && 'bg-card hover:border-primary/50 cursor-pointer border-border',
          autoFilled && 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700',
          open && 'ring-2 ring-ring border-primary/50',
        )}
      >
        <span className={cn(!displayText && 'text-muted-foreground')}>
          {displayText || 'Selecione...'}
        </span>
        <span className="text-muted-foreground text-xs">{options.length} opções</span>
      </button>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-card rounded-lg border border-border shadow-lg max-h-80 flex flex-col">
          {/* Barra de busca + toggle */}
          <div className="p-2 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
            {onToggleMultiSelect && (
              <Button
                variant={multiSelectEnabled ? 'default' : 'ghost'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMultiSelect();
                }}
                className={cn(
                  'text-xs h-7 w-full transition-all duration-200',
                  multiSelectEnabled
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800'
                    : '',
                )}
                type="button"
              >
                <Layers className="w-3 h-3 mr-1" />
                {multiSelectEnabled ? 'Multi ativo' : 'Ativar multi-seleção'}
              </Button>
            )}
          </div>

          {/* Ações rápidas */}
          {multiSelectEnabled && (
            <div className="flex gap-1 px-2 py-1.5 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllVisible}
                className="text-xs h-7"
                type="button"
              >
                Selecionar visíveis
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs h-7"
                type="button"
              >
                Limpar
              </Button>
            </div>
          )}

          {/* Lista de opções */}
          <div className="overflow-y-auto flex-1 max-h-48">
            {filteredOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum valor encontrado
              </p>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors duration-150',
                    localSelected.has(option) && 'bg-blue-50 dark:bg-blue-950',
                  )}
                >
                  <Checkbox
                    checked={localSelected.has(option)}
                    onCheckedChange={() => toggleValue(option)}
                    id={`opt-${label}-${option}`}
                  />
                  <span className="text-sm truncate">{option}</span>
                </label>
              ))
            )}
          </div>

          {/* Confirmar */}
          {multiSelectEnabled && (
            <div className="p-2 border-t border-border">
              <Button
                onClick={handleConfirm}
                size="sm"
                className="w-full transition-all duration-200"
                type="button"
              >
                <Check className="w-4 h-4 mr-1" />
                Confirmar ({localSelected.size})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
