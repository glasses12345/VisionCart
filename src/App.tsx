import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ListChecks, Plus, Trash2, X } from 'lucide-react';
import { Route, Router as WouterRouter } from 'wouter';

const LOGO_URL = `${import.meta.env.BASE_URL}visioncart-logo.png`;

type ShoppingItem = {
  id: string;
  name: string;
  completed: boolean;
  addedAt: number;
};

type StatusTone = 'neutral' | 'success' | 'alert';

const STORAGE_KEY = 'rayban-shopping-list';
const FOCUSABLE_SELECTOR = '.focusable:not([disabled]):not(.hidden)';
const starterItems: ShoppingItem[] = [
  { id: 'starter-oat-milk', name: 'Oat milk', completed: false, addedAt: 1 },
  { id: 'starter-sourdough', name: 'Sourdough loaf', completed: false, addedAt: 2 },
  { id: 'starter-tomatoes', name: 'Cherry tomatoes', completed: false, addedAt: 3 },
  { id: 'starter-tablets', name: 'Dishwasher tablets', completed: false, addedAt: 4 },
  { id: 'starter-oil', name: 'Olive oil', completed: true, addedAt: 5 },
];

function readSavedItems(): ShoppingItem[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return starterItems;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return starterItems;
    return parsed.filter(
      (item): item is ShoppingItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ShoppingItem).id === 'string' &&
        typeof (item as ShoppingItem).name === 'string' &&
        typeof (item as ShoppingItem).completed === 'boolean',
    );
  } catch {
    return starterItems;
  }
}

function createItem(name: string): ShoppingItem {
  return {
    id: `typed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    completed: false,
    addedAt: Date.now(),
  };
}

function Home() {
  const [items, setItems] = useState<ShoppingItem[]>(readSavedItems);
  const [draft, setDraft] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isClearMenuOpen, setIsClearMenuOpen] = useState(false);
  const [status, setStatus] = useState('Ready for input');
  const [statusTone, setStatusTone] = useState<StatusTone>('neutral');
  const listRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const clearAllButtonRef = useRef<HTMLButtonElement>(null);

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || a.addedAt - b.addedAt),
    [items],
  );
  const selectedIndex = orderedItems.findIndex((item) => item.id === selectedId);
  const remainingCount = items.filter((item) => !item.completed).length;
  const completedCount = items.length - remainingCount;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (isComposerOpen) composerInputRef.current?.focus();
  }, [isComposerOpen]);

  useEffect(() => {
    if (isClearMenuOpen) clearAllButtonRef.current?.focus();
  }, [isClearMenuOpen]);

  useEffect(() => {
    const selectedRow = document.querySelector<HTMLElement>(`[data-item-id="${selectedId}"]`);
    selectedRow?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, orderedItems.length]);

  const addItem = (rawName: string) => {
    const name = rawName.trim();
    if (!name) {
      setStatus('Type an item before adding');
      setStatusTone('alert');
      return false;
    }
    const newItem = createItem(name);
    setItems((current) => [...current, newItem]);
    setDraft('');
    setIsComposerOpen(false);
    setSelectedId(newItem.id);
    setStatus(`Added: ${name}`);
    setStatusTone('success');
    return true;
  };

  const handlePlus = () => {
    if (!isComposerOpen) {
      setIsComposerOpen(true);
      return;
    }
    addItem(draft);
  };

  const toggleItem = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
    setStatus(target.completed ? `Moved back to list: ${target.name}` : `Completed: ${target.name}`);
    setStatusTone('success');
  };

  const deleteItem = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    const remaining = orderedItems.filter((item) => item.id !== id);
    const nextSelection = remaining[Math.min(Math.max(selectedIndex, 0), Math.max(remaining.length - 1, 0))];
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedId(nextSelection?.id ?? null);
    if (revealedId === id) setRevealedId(null);
    setStatus(`Removed: ${target.name}`);
    setStatusTone('success');
  };

  const clearAll = () => {
    if (!items.length) {
      setStatus('The list is already clear');
      setStatusTone('neutral');
      setIsClearMenuOpen(false);
      return;
    }
    setItems([]);
    setSelectedId(null);
    setRevealedId(null);
    setIsClearMenuOpen(false);
    setStatus('Cleared all items');
    setStatusTone('success');
  };

  const clearCompleted = () => {
    const remainingItems = items.filter((item) => !item.completed);
    if (remainingItems.length === items.length) {
      setStatus('No checked items to clear');
      setStatusTone('neutral');
      setIsClearMenuOpen(false);
      return;
    }
    setItems(remainingItems);
    setSelectedId(remainingItems.some((item) => item.id === selectedId) ? selectedId : remainingItems[0]?.id ?? null);
    setRevealedId(null);
    setIsClearMenuOpen(false);
    setStatus(`Cleared ${items.length - remainingItems.length} checked item${items.length - remainingItems.length === 1 ? '' : 's'}`);
    setStatusTone('success');
  };

  const moveFocus = (direction: 'up' | 'down' | 'left' | 'right') => {
    const focusables = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (!focusables.length) return;

    const activeElement = document.activeElement as HTMLElement | null;
    const currentIndex = activeElement ? focusables.indexOf(activeElement) : -1;
    const isPrevious = direction === 'up' || direction === 'left';
    const nextIndex = currentIndex === -1
      ? 0
      : isPrevious
        ? (currentIndex > 0 ? currentIndex - 1 : focusables.length - 1)
        : (currentIndex < focusables.length - 1 ? currentIndex + 1 : 0);
    const nextElement = focusables[nextIndex];
    nextElement.focus();
    nextElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    const itemId = nextElement.closest<HTMLElement>('[data-item-id]')?.dataset.itemId;
    if (itemId) {
      setSelectedId(itemId);
      if (itemId !== revealedId) setRevealedId(null);
    }
    setStatus(`Focus ${nextIndex + 1} of ${focusables.length}`);
    setStatusTone('neutral');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const isTextField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && isTextField) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus('down');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus('up');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocus('right');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveFocus('left');
    } else if (event.key === 'Enter' && target.tagName === 'DIV') {
      const activeElement = document.activeElement as HTMLElement | null;
      const itemId = activeElement?.closest<HTMLElement>('[data-item-id]')?.dataset.itemId;
      if (!itemId || !activeElement?.classList.contains('focusable')) return;
      event.preventDefault();
      setSelectedId(itemId);
      setRevealedId(itemId);
      const targetItem = items.find((item) => item.id === itemId);
      setStatus(targetItem ? `Opened ${targetItem.name}` : 'Item opened');
      setStatusTone('neutral');
    } else if ((event.key === 'Backspace' || event.key === 'Delete') && selectedIndex >= 0) {
      event.preventDefault();
      deleteItem(orderedItems[selectedIndex].id);
    } else if (event.key === 'Escape') {
      setDraft('');
      setStatus('Draft cleared');
      setStatusTone('neutral');
    }
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addItem(draft);
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      setDraft('');
      setIsComposerOpen(false);
      setStatus('Draft cleared');
      setStatusTone('neutral');
    }
  };

  return (
    <main className="hud-page" onKeyDown={handleKeyDown}>
      <section className="hud-frame" aria-label="Ray-Ban shopping list">
        <div className="hud-content">
          <header className="hud-header">
            <div className="brand-mark" aria-label="VisionCart" data-testid="text-brand">
              <span className="brand-logo" aria-hidden="true">
                <img src={LOGO_URL} alt="" />
              </span>
            </div>
            <div className="header-meta">
              <span className="live-chip">LIVE</span>
              <span aria-label="Current display mode">HUD / 01</span>
            </div>
          </header>

          <div className="hero-line">
            <div className="counter" data-testid="text-item-count">
              <strong>{remainingCount}</strong>
              <span>to go</span>
            </div>
            <div className="input-deck">
              <button className="icon-button plus-button focusable" type="button" onClick={handlePlus} aria-label={isComposerOpen ? 'Add item' : 'Open text input'} aria-expanded={isComposerOpen} data-testid="button-plus">
                <Plus size={16} strokeWidth={2.4} />
              </button>
              {isComposerOpen && (
                <form className="input-shell" onSubmit={(event) => { event.preventDefault(); addItem(draft); }}>
                  <span className="input-prefix" aria-hidden="true">&gt;</span>
                  <input
                    ref={composerInputRef}
                    id="shopping-input"
                    className="focusable"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleFormKeyDown}
                    placeholder="Add an item..."
                    aria-label="Add an item"
                    autoComplete="off"
                    data-testid="input-add-item"
                  />
                </form>
              )}
            </div>
          </div>

          <div className="list-head">
            <span className="section-label">Current list <span aria-hidden="true">/</span> {items.length}</span>
            <div className="list-actions">
              <span className="key-hint">↑ ↓ navigate&nbsp;&nbsp; ↵ open</span>
              <div className="clear-wrap">
                <button
                  className="clear-button focusable"
                  type="button"
                  onClick={() => setIsClearMenuOpen((open) => !open)}
                  aria-label="Clear list"
                  aria-expanded={isClearMenuOpen}
                  aria-haspopup="menu"
                  data-testid="button-clear"
                >
                  <Trash2 size={14} strokeWidth={1.8} />
                  <span>Clear</span>
                </button>
                {isClearMenuOpen && (
                  <div className="clear-menu" role="menu" aria-label="Clear list options">
                    <button ref={clearAllButtonRef} className="menu-button focusable" type="button" role="menuitem" onClick={clearAll} data-testid="button-clear-all">
                      Clear all
                    </button>
                    <button className="menu-button focusable" type="button" role="menuitem" disabled={!completedCount} onClick={clearCompleted} data-testid="button-clear-checked">
                      Clear all checked
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="list-viewport" ref={listRef} role="list" aria-label="Shopping items" data-testid="list-items">
            {!orderedItems.length ? (
              <div className="empty-state" data-testid="empty-shopping-list">
                <ListChecks size={25} strokeWidth={1.4} aria-hidden="true" />
                <strong>Your list is clear.</strong>
                <span>Add something for the next stop.</span>
              </div>
            ) : (
              orderedItems.map((item, index) => (
                <div
                  key={item.id}
                className={`shopping-row focusable ${item.id === selectedId ? 'is-selected' : ''} ${item.completed ? 'is-complete' : ''}`}
                  data-item-id={item.id}
                  data-testid={`row-item-${item.id}`}
                  role="listitem"
                  aria-current={item.id === selectedId ? 'true' : undefined}
                  tabIndex={item.id === selectedId ? 0 : -1}
                  onFocus={() => setSelectedId(item.id)}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="item-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="item-main">
                    {item.id === revealedId && (
                      <button
                        className="check-button focusable"
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        aria-label={item.completed ? `Mark ${item.name} active` : `Complete ${item.name}`}
                        data-testid={`button-toggle-${item.id}`}
                      >
                        <Check size={15} strokeWidth={2.4} />
                      </button>
                    )}
                    <span className="item-name" data-testid={`text-item-${item.id}`}>{item.name}</span>
                    {item.completed && <span className="item-quiet">done</span>}
                  </div>
                  {item.id === revealedId && (
                    <button className="delete-button focusable" type="button" onClick={() => deleteItem(item.id)} aria-label={`Delete ${item.name}`} data-testid={`button-delete-${item.id}`}>
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={`status-bar ${statusTone === 'alert' ? 'is-alert' : ''} ${statusTone === 'success' ? 'is-success' : ''}`} role="status" aria-live="polite" data-testid="status-feedback">
            <span className="status-indicator" aria-hidden="true" />
            <span>{status}</span>
          </div>
          <footer className="footer-line">
            <span>{completedCount ? `${completedCount} completed` : 'Nothing completed yet'}</span>
            <span><kbd>ESC</kbd> clear draft&nbsp;&nbsp; <kbd>DEL</kbd> remove</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Route path="/" component={Home} />
    </WouterRouter>
  );
}

export default App;
