import React, { useEffect, useRef, useState } from 'react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  headerRight,
  children,
  maxHeight = 'max-h-[85vh]'
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visualOpen, setVisualOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; time: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let unmountTimer: number | undefined;

    if (isOpen) {
      setShouldRender(true);
      setDragY(0);
      setIsDragging(false);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setVisualOpen(true);
        });
      });
    } else {
      setVisualOpen(false);
      setDragY(0);
      setIsDragging(false);
      unmountTimer = window.setTimeout(() => {
        setShouldRender(false);
      }, 230);
    }

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (unmountTimer !== undefined) clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const stateAttr = visualOpen ? 'open' : 'closed';
  const backdropOpacity =
    isDragging && dragY > 0 ? Math.max(0.2, 1 - dragY / 320) : undefined;

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    dragStartRef.current = { y: e.clientY, time: performance.now() };
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dy = e.clientY - dragStartRef.current.y;
    if (!isDragging && dy > 4) {
      setIsDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (isDragging || dy > 4) {
      setDragY(Math.max(0, dy));
    }
  };

  const handleDragPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dy = e.clientY - dragStartRef.current.y;
    const dt = Math.max(1, performance.now() - dragStartRef.current.time);
    const velocity = dy / dt;
    const wasDragging = isDragging;
    dragStartRef.current = null;
    setIsDragging(false);

    if (wasDragging && (dy > 88 || (dy > 24 && velocity > 0.45))) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[var(--z-sheet)] flex flex-col justify-end ${
        isOpen ? '' : 'pointer-events-none'
      }`.trim()}
    >
      {/* Backdrop */}
      <div
        data-state={stateAttr}
        style={backdropOpacity !== undefined ? { opacity: backdropOpacity } : undefined}
        className="fixed inset-0 bg-black/40 sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        data-state={stateAttr}
        data-dragging={isDragging ? 'true' : undefined}
        style={isDragging && dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        onTransitionEnd={e => {
          if (!isOpen && e.target === panelRef.current) {
            setShouldRender(false);
          }
        }}
        className={`relative z-10 w-full bg-[var(--surface)] border-t border-[var(--border)] rounded-t-[var(--radius-sheet)] shadow-[var(--shadow-sheet)] flex flex-col ${maxHeight} overflow-hidden sheet-panel`}
      >
        {/* Drag Handle + Header Drag Zone */}
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerEnd}
          onPointerCancel={handleDragPointerEnd}
          className="shrink-0 touch-none select-none"
        >
          {/* Drag Handle Indicator */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
          </div>

          {/* Optional Header */}
          {(title || headerRight) && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--rule)]">
              {title ? (
                <h2 className="text-[16px] leading-[24px] font-semibold text-[var(--text-primary)]">
                  {title}
                </h2>
              ) : (
                <div />
              )}
              {headerRight}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
