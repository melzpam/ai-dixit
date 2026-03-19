"use client";

export function Timer({ seconds }: { seconds: number }) {
  const isUrgent = seconds <= 5 && seconds > 0;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-mono font-bold ${
        isUrgent
          ? "bg-red-600/30 text-red-300 animate-pulse"
          : "bg-white/10 text-white/80"
      }`}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {seconds}s
    </div>
  );
}
