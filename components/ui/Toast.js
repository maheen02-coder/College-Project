"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, ring: "border-emerald-200", iconColor: "text-emerald-600" },
  error: { icon: TriangleAlert, ring: "border-rose-200", iconColor: "text-rose-600" },
  info: { icon: Info, ring: "border-violet-200", iconColor: "text-violet-600" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message, tone = "info", title = "") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current.slice(-3), { id, message, tone, title }]);
      setTimeout(() => dismiss(id), 4200);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[10000] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((item) => {
            const meta = TONES[item.tone] || TONES.info;
            const Icon = meta.icon;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-3.5 shadow-[0_20px_50px_-20px_rgba(23,19,50,0.35)] ${meta.ring}`}
              >
                <Icon size={17} className={`mt-0.5 shrink-0 ${meta.iconColor}`} />
                <div className="min-w-0 flex-1">
                  {item.title ? <p className="text-[0.8rem] font-semibold text-ink">{item.title}</p> : null}
                  <p className="text-[0.78rem] leading-relaxed text-mist">{item.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded-md p-0.5 text-mist transition hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
