import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchableSelectProps {
    options: string[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
    loadingText?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Search or select...',
    disabled = false,
    loadingText,
}: SearchableSelectProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Filter options based on query
    const filtered = query
        ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
        : options;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightIndex >= 0 && listRef.current) {
            const item = listRef.current.children[highlightIndex] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightIndex]);

    const handleSelect = useCallback((opt: string) => {
        onChange(opt);
        setQuery('');
        setIsOpen(false);
        setHighlightIndex(-1);
    }, [onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && highlightIndex >= 0 && filtered[highlightIndex]) {
            e.preventDefault();
            handleSelect(filtered[highlightIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setHighlightIndex(-1);
        }
    };

    const displayValue = isOpen ? query : (value ?? '');

    return (
        <div ref={containerRef} className="searchable-select">
            <input
                ref={inputRef}
                type="text"
                className="form-select searchable-select-input"
                value={displayValue}
                placeholder={disabled ? (loadingText ?? placeholder) : placeholder}
                disabled={disabled}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                    setHighlightIndex(-1);
                }}
                onFocus={() => {
                    setIsOpen(true);
                    setQuery('');
                }}
                onKeyDown={handleKeyDown}
            />
            {/* Clear button */}
            {value && !isOpen && (
                <button
                    className="searchable-select-clear"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange(null);
                        setQuery('');
                        inputRef.current?.focus();
                    }}
                    tabIndex={-1}
                    aria-label="Clear selection"
                >
                    ×
                </button>
            )}
            {isOpen && filtered.length > 0 && (
                <ul ref={listRef} className="searchable-select-dropdown">
                    {filtered.map((opt, i) => (
                        <li
                            key={opt}
                            className={`searchable-select-option${i === highlightIndex ? ' highlighted' : ''}${opt === value ? ' selected' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(opt);
                            }}
                            onMouseEnter={() => setHighlightIndex(i)}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
            {isOpen && query && filtered.length === 0 && (
                <ul className="searchable-select-dropdown">
                    <li className="searchable-select-option no-results">
                        No matches for "{query}"
                    </li>
                </ul>
            )}
        </div>
    );
}
