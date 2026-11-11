import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import '../styles/all-frames.css';

type Option<T extends string> = { value: T; label: string };

/**
 * The shop's "Sort by" control: a button that opens a short list below it. The list unfolds
 * from the button (scale and fade), its rows slide in one after another, the chosen row is
 * marked with a check, and a hairline under the hovered row draws across.
 * Keyboard: arrows move, Home/End jump, Enter/Space choose, Escape or Tab close.
 */
function ShopSortMenu<T extends string>({ value, options, onChange }: { value: T; options: Option<T>[]; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const current = options[selectedIndex];

  const openMenu = (index = selectedIndex) => {
    setActive(index);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    close();
    if (option && option.value !== value) onChange(option.value);
  };

  // Focus follows the active row; a click outside closes the list.
  useEffect(() => {
    if (!open) return;
    (listRef.current?.children[active] as HTMLElement | undefined)?.focus();
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const onListKey = (event: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (event.key === 'ArrowDown') setActive((index) => (index >= last ? 0 : index + 1));
    else if (event.key === 'ArrowUp') setActive((index) => (index <= 0 ? last : index - 1));
    else if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(last);
    else if (event.key === 'Enter' || event.key === ' ') choose(active);
    else if (event.key === 'Escape') close();
    else if (event.key === 'Tab') close(false);
    else return;
    if (event.key !== 'Tab') event.preventDefault();
  };

  return (
    <div ref={rootRef} className="fy-sort" data-open={open || undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="fy-sort__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(event.key === 'ArrowUp' ? options.length - 1 : selectedIndex);
          }
        }}
      >
        <span className="fy-sort__label">Sort by</span>
        {/* Keyed so the new choice slides in when it changes. */}
        <span key={current.value} className="fy-sort__value">{current.label}</span>
        <ChevronDown className="fy-sort__chevron" strokeWidth={1.8} aria-hidden="true" />
      </button>

      {open && (
        <ul ref={listRef} id={listId} role="listbox" aria-label="Sort frames by" className="fy-sort__list" onKeyDown={onListKey}>
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={selected}
                tabIndex={index === active ? 0 : -1}
                className="fy-sort__option"
                style={{ '--i': index } as React.CSSProperties}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                <Check className="fy-sort__check" strokeWidth={2.4} aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ShopSortMenu;
