"use client";

import { useState } from "react";
import type { CardView } from "@ai-dixit/shared";

interface CardProps {
  card: CardView;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  showOwner?: string;
  /** Enable hover zoom (large preview overlay) */
  zoomOnHover?: boolean;
}

export function Card({ card, onClick, selected, disabled, showOwner, zoomOnHover }: CardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => zoomOnHover && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
        style={{ aspectRatio: "3/4", width: "100%" }}
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

      {/* Hover zoom overlay */}
      {hovered && card.imageBase64 && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none">
          <div className="w-72 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-2 ring-white/20">
            <img
              src={`data:image/png;base64,${card.imageBase64}`}
              alt="Card preview"
              className="w-full"
              style={{ aspectRatio: "3/4" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
