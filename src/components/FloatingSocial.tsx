"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const FB_URL = "https://www.facebook.com/profile.php?id=61578053085735";

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

export function FloatingSocial() {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fb-bubble-dismissed");
    if (saved !== "1") setDismissed(false);
  }, []);

  function dismiss() {
    localStorage.setItem("fb-bubble-dismissed", "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {/* Expanded card */}
      {expanded && (
        <div className="animate-rise bg-[#1a2236] border border-white/[0.1] rounded-2xl p-3.5 shadow-2xl w-52">
          <p className="text-[11px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">Síguenos</p>
          <a
            href={FB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-[#1877f2]/15 border border-[#1877f2]/30 hover:bg-[#1877f2]/25 transition-colors rounded-xl px-3 py-2.5"
          >
            <span className="text-[#1877f2] shrink-0">
              <FacebookIcon size={18} />
            </span>
            <span className="text-white text-xs font-semibold leading-tight">Facebook<br /><span className="text-slate-400 font-normal text-[10px]">WCGTF 2026</span></span>
          </a>
        </div>
      )}

      {/* Bubble row */}
      <div className="flex items-center gap-2">
        {/* Dismiss X */}
        <button
          onClick={dismiss}
          className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Cerrar"
        >
          <X size={11} />
        </button>

        {/* Main bubble */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-12 h-12 rounded-full bg-[#1877f2] shadow-[0_4px_20px_-4px_rgba(24,119,242,0.7)] flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-all"
          aria-label="Facebook"
        >
          <FacebookIcon size={22} />
        </button>
      </div>
    </div>
  );
}
