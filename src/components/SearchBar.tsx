import { useState, useRef, useEffect, useId } from 'react';
import { SUGGESTED_BRANDS } from '../services/brandService';

interface SearchBarProps {
  onQuery: (brand: string) => void;
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ onQuery, loading, value, onChange }: SearchBarProps) {
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const composing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const inputId = useId();
  const filtered = SUGGESTED_BRANDS.filter((brand) => brand.includes(value.trim()));
  const listOpen = showSuggest && filtered.length > 0;

  const submit = (text?: string) => {
    const target = (text ?? value).trim();
    if (!target || composing.current) return;
    setShowSuggest(false);
    setActiveIdx(-1);
    onChange(target);
    onQuery(target);
  };

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggest(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
      <form
        onSubmit={(event) => { event.preventDefault(); submit(); }}
        className="flex items-center gap-2 sm:gap-3 bg-white rounded-2xl shadow-lg border border-ink-200 p-2 focus-within:border-gold-500 focus-within:ring-4 focus-within:ring-gold-500/20 transition-all"
      >
        <div className="pl-1 sm:pl-3 text-ink-400 shrink-0" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <label htmlFor={inputId} className="sr-only">白酒品牌名称</label>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={listOpen}
          aria-activedescendant={listOpen && activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
          autoComplete="off"
          maxLength={100}
          value={value}
          placeholder="输入品牌，如：茅台、五粮液…"
          className="flex-1 min-w-0 bg-transparent outline-none text-base sm:text-lg text-ink-800 placeholder:text-ink-400"
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          onChange={(event) => {
            onChange(event.target.value);
            setShowSuggest(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => { setShowSuggest(false); setActiveIdx(-1); }}
          onKeyDown={(event) => {
            if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === 'Enter') {
              event.preventDefault();
              submit(listOpen && activeIdx >= 0 ? filtered[activeIdx] : undefined);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!filtered.length) { setActiveIdx(-1); return; }
              setShowSuggest(true);
              setActiveIdx((index) => event.key === 'ArrowDown'
                ? (index + 1) % filtered.length
                : (index <= 0 ? filtered.length - 1 : index - 1));
            } else if (event.key === 'Escape') {
              setShowSuggest(false);
              setActiveIdx(-1);
            }
          }}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          aria-label={loading ? '查询另一个品牌' : '查询品牌'}
          className="shrink-0 flex items-center gap-1.5 px-3 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-baijiu-700 to-gold-500 text-white font-medium text-sm sm:text-base hover:from-baijiu-800 hover:to-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
        >
          {loading && <svg aria-hidden="true" className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
          查询
        </button>
      </form>

      {listOpen && (
        <div id={listId} role="listbox" aria-label="品牌建议" className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-ink-200 overflow-y-auto max-h-72 z-20">
          {filtered.map((brand, index) => (
            <button
              type="button"
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIdx}
              tabIndex={-1}
              key={brand}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIdx(index)}
              onClick={() => submit(brand)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-baijiu-50 transition-colors ${index === activeIdx ? 'bg-baijiu-50' : ''}`}
            >
              <span aria-hidden="true" className="text-ink-400 text-sm">🏷</span>
              <span className="text-ink-700 font-medium">{brand}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
