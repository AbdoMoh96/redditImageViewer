import React from "react";

const Layout = (props) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-[-12%] right-[-8%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[110px]" />
        <div className="absolute top-[18%] left-[-10%] h-[300px] w-[300px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>
      <div className="relative min-h-screen flex flex-col">
        <header className="px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/70">
              Reddit Image Viewer
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
              Infinite visual stacks for any subreddit
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-400 font-[var(--font-jetbrains-mono)]">
            <span className="rounded-full border border-slate-700/70 px-3 py-1">← / → Navigate</span>
            <span className="rounded-full border border-slate-700/70 px-3 py-1">↑ Focus</span>
          </div>
        </header>
        <main className="relative flex-1">{props.children}</main>
      </div>
    </div>
  );
};

export default Layout;
