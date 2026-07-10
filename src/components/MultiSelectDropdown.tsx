import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, Check, Lock, Zap, Layers } from 'lucide-react';

interface MultiSelectDropdownProps {
  /** Valores disponíveis para seleção */
  options: string[];
  /** Valores atualmente selecionados */
  selected: string[];
  /** Callback ao confirmar seleção */
  onConfirm: (values: string[]) => void;
  /** Se está bloqueado (coluna seguinte ainda não liberada) */
  disabled?: boolean;
  /** Se o campo foi preenchido por avanço automático */
  autoFilled?: boolean;
  /** Se a coluna está travada */
  locked?: boolean;
  /** Se multi-seleção está habilitada */
  multiSelectEnabled?: boolean;
  /** Callback para alternar multi-seleção */
  onToggleMultiSelect?: () => void;
  /** Label da coluna */
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

  // Sincronizar localSelected com selected externo
  useEffect(() => {
    setLocalSelected(new Set(selected));
  }, [selected]);

  // Fechar dropdown ao clicar fora
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
        // Modo multi: toggle normal (add/remove), confirma só no botão
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
        // Modo single: confirma IMEDIATAMENTE ao clicar, sem botão
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
      {/* Label + badges */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
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
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-medium">
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
          disabled && 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
          !disabled && 'bg-white hover:border-blue-400 cursor-pointer border-gray-300',
          autoFilled && 'bg-blue-50 border-blue-300',
          open && 'ring-2 ring-blue-200 border-blue-400',
        )}
      >
        <span className={cn(!displayText && 'text-gray-400')}>
          {displayText || 'Selecione...'}
        </span>
        <span className="text-gray-400 text-xs">{options.length} opções</span>
      </button>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-80 flex flex-col">
          {/* Barra de busca + toggle multi */}
          <div className="p-2 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
            {/* Toggle multi-seleção */}
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
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'text-gray-500',
                )}
                type="button"
              >
                <Layers className="w-3 h-3 mr-1" />
                {multiSelectEnabled ? 'Multi ativo' : 'Ativar multi-seleção'}
              </Button>
            )}
          </div>

          {/* Ações rápidas — só aparecem com multi ativo */}
          {multiSelectEnabled && (
            <div className="flex gap-1 px-2 py-1.5 border-b border-gray-100">
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
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhum valor encontrado
              </p>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors duration-150',
                    localSelected.has(option) && 'bg-blue-50',
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

          {/* Confirmar — só aparece com multi-seleção ativa */}
          {multiSelectEnabled && (
            <div className="p-2 border-t border-gray-100">
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
