import { signIn } from "@/auth";
import { Trophy } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="app-shell relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-green-500/[0.12] blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[420px] h-[420px] rounded-full bg-blue-500/[0.08] blur-3xl" />
      </div>

      <div className="animate-rise relative w-full max-w-sm">
        <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 flex flex-col items-center gap-7 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
          {/* hairline top accent */}
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />

          <div className="flex flex-col items-center gap-4">
            <span className="grid place-items-center w-16 h-16 rounded-2xl bg-green-400/10 ring-1 ring-green-400/30 halo-green">
              <Trophy size={32} className="text-green-400" strokeWidth={1.8} />
            </span>
            <div className="text-center">
              <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
                WCGTF <span className="text-gradient-brand">2026</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1.5">Quiniela del Mundial</p>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
            className="w-full"
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl py-3 px-4 transition-colors text-sm shadow-lg active:scale-[0.98]"
            >
              <GoogleIcon />
              Entrar con Google
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Solo usuarios con invitación pueden participar.
          </p>
        </div>
      </div>
    </main>
  );
}
