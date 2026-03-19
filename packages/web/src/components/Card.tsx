"use client";

import type { CardView } from "@ai-dixit/shared";

interface CardProps {
  card: CardView;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  showOwner?: string;
}

export function Card({ card, onClick, selected, disabled, showOwner }: CardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`relative group rounded-xl overflow-hidden transition-all duration-200 ${
        onClick && !disabled
          ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-purple-400"
          : "cursor-default"
      } ${
        selected
          ? "ring-3 ring-amber-400 scale-105 shadow-lg shadow-amber-400/20"
          : ""
      }`}
      style={{ aspectRatio: "1/1", width: "100%" }}
    >
      {card.imageBase64 ? (
        <img
          src={`data:image/png;base64,${card.imageBase64}`}
          alt="AI generated card"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center p-4">
          <p className="text-center text-sm text-white/80 italic leading-relaxed">
            {card.prompt || "No image"}
          </p>
        </div>
      )}
      {showOwner && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-1.5 text-center">
          <span className="text-xs font-medium text-white">{showOwner}</span>
        </div>
      )}
    </button>
  );
}
