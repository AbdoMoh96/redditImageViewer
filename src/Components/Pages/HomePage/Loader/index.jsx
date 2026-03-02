"use client";

import React from "react";
import loaderImage from "../../../../Resources/Pages/HomePage/img/reddit.gif";

const Loader = () => {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 backdrop-blur">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-800/70 bg-slate-950/90 px-8 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <img
          src={loaderImage.src || loaderImage}
          alt=""
          className="h-16 w-16 rounded-full"
        />
        <div className="text-xs uppercase tracking-[0.4em] text-emerald-300">
          Loading stack
        </div>
        <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-400/80" />
        </div>
      </div>
    </div>
  );
};

export default Loader;
