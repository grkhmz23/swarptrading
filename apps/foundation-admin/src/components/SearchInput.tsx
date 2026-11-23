import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  /** Currently applied search term (controlled by the parent). */
  value: string;
  /** Called with the new term after typing settles, or immediately on clear. */
  onSearch: (term: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onSearch,
  placeholder = "Search...",
  className = "",
  debounceMs = 300,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const [appliedValue, setAppliedValue] = useState(value);

  // Follow external changes (clear button elsewhere, back/forward navigation).
  if (value !== appliedValue) {
    setAppliedValue(value);
    setDraft(value);
  }

  const debounced = useDebounce(draft, debounceMs);

  useEffect(() => {
    // Only fire once typing has settled, and only for a real change.
    if (debounced === draft && debounced !== value) {
      onSearch(debounced);
    }
  }, [debounced, draft, value, onSearch]);

  const handleClear = () => {
    setDraft('');
    if (value !== '') onSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="pl-9 pr-9"
        aria-label={placeholder}
      />
      {draft && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
