"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCompareState } from "./CompareProvider";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function BottomSheet({ open, onClose, title, children, onPrev, onNext }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const { selected } = useCompareState();
  const hasCompareSelections = selected.length > 0;
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setContentReady(false);
      return;
    }
    document.body.style.overflow = "hidden";
    // Defer children rendering to next frame so the animation starts without layout cost
    const raf = requestAnimationFrame(() => setContentReady(true));
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handleKey); cancelAnimationFrame(raf); };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={sheetRef}
        className="
          absolute bg-surface-container border-l border-surface-bright will-change-transform
          sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-lg sm:animate-[slide-in-right_0.2s_ease-out]
          max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[85vh] max-sm:rounded-t-2xl max-sm:bottom-sheet-enter
          flex flex-col overflow-hidden
        "
        style={{ contain: "content" }}
      >
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-on-surface-variant/30" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-bright sticky top-0 bg-surface-container z-10">
          <div className="flex items-center gap-2">
            {onPrev && <button onClick={onPrev} className="p-1.5 hover:bg-surface-bright rounded-lg text-on-surface-variant min-w-[28px] min-h-[28px] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h12" /><path d="m6 12 4-4" /><path d="m6 12 4 4" /></svg></button>}
            <h3 className="text-on-surface font-display font-semibold text-lg truncate">{title}</h3>
            {onNext && <button onClick={onNext} className="p-1.5 hover:bg-surface-bright rounded-lg text-on-surface-variant min-w-[28px] min-h-[28px] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 12H6" /><path d="m18 12-4-4" /><path d="m18 12-4 4" /></svg></button>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-bright rounded-lg text-on-surface-variant min-w-[44px] min-h-[44px] flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
        </div>
        <div className={`flex-1 overflow-y-auto px-4 py-4 ${hasCompareSelections ? "pb-20" : ""}`}>
          {contentReady ? children : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
