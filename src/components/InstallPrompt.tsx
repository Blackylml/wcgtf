"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "wcgtf-pwa-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return; // ya instalada

    // iOS Safari no dispara beforeinstallprompt → mostrar instrucciones
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (ios) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detección de entorno una vez al montar
      setIsIOS(true); setShow(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] w-[min(92%,28rem)]"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)" }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-[#0b1322]/95 backdrop-blur-xl px-3.5 py-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-green-400/10 ring-1 ring-green-400/30 halo-green shrink-0">
          <Download size={17} className="text-green-400" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-tight">Instala WCGTF</p>
          {isIOS ? (
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5 flex items-center gap-1 flex-wrap">
              Toca <Share size={11} className="inline text-blue-400" /> Compartir y luego “Agregar a inicio”.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Agrégala a tu pantalla de inicio.</p>
          )}
        </div>
        {!isIOS && (
          <button
            onClick={install}
            className="shrink-0 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white text-xs font-semibold rounded-lg px-3 py-2 transition-all active:scale-95"
          >
            Instalar
          </button>
        )}
        <button onClick={dismiss} aria-label="Cerrar" className="shrink-0 grid place-items-center w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
