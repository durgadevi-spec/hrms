import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';
import { cn } from '../../utils/formatters';

export interface EmployeeSelectOption {
  id: string;
  name: string;
  code?: string;
  department?: string;
}

interface SearchableEmployeeSelectProps {
  options: EmployeeSelectOption[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  placeholder?: string;
  className?: string;
}

export default function SearchableEmployeeSelect({
  options,
  value,
  onChange,
  allLabel = 'All Employees',
  placeholder = 'Search employee...',
  className,
}: SearchableEmployeeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.code && opt.code.toLowerCase().includes(q)) ||
        (opt.department && opt.department.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Find currently selected label
  const selectedOption = useMemo(() => {
    if (value === 'all') return null;
    return options.find((opt) => String(opt.id) === String(value));
  }, [options, value]);

  const selectedDisplayLabel = selectedOption ? selectedOption.name : allLabel;

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'input-field flex items-center justify-between gap-2 text-sm w-full py-2 px-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl transition-all cursor-pointer',
          isOpen ? 'ring-2 ring-primary-500 border-primary-500' : 'hover:border-surface-400 dark:hover:border-surface-600'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 text-secondary-400 shrink-0" />
          <span className="truncate text-secondary-900 dark:text-white font-medium">
            {selectedDisplayLabel}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-secondary-400 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 left-0 sm:left-auto sm:right-0 mt-1.5 w-full sm:w-72 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Search Bar inside Dropdown */}
          <div className="p-2.5 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-primary-500 text-secondary-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800 py-1">
            {/* "All Employees" option (only when not searching or matches "all") */}
            {(!searchQuery || allLabel.toLowerCase().includes(searchQuery.toLowerCase())) && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors text-left',
                  value === 'all'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-secondary-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
                )}
              >
                <span>{allLabel}</span>
                {value === 'all' && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
              </button>
            )}

            {/* Filtered Employee List */}
            {filteredOptions.length === 0 && searchQuery ? (
              <div className="px-3 py-6 text-center text-xs text-secondary-400">
                No employees matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.id) === String(value);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(String(opt.id))}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left',
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold'
                        : 'text-secondary-800 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-medium">{opt.name}</p>
                      {(opt.code || opt.department) && (
                        <p className="text-[10px] text-secondary-400 truncate">
                          {[opt.code, opt.department].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

