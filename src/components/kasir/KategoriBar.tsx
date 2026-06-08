"use client";

import { useState, useRef } from "react";
import { GripVertical } from "lucide-react";

interface Props {
  kategoriList: string[];
  active: string;
  onSelect: (k: string) => void;
  onReorder: (newOrder: string[]) => void;
}

export default function KategoriBar({ kategoriList, active, onSelect, onReorder }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (idx: number) => {
    setDragging(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIndex(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragging === null || dragging === idx) {
      setDragging(null);
      setOverIndex(null);
      return;
    }
    const newOrder = [...kategoriList];
    const [moved] = newOrder.splice(dragging, 1);
    newOrder.splice(idx, 0, moved);
    onReorder(newOrder);
    setDragging(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setOverIndex(null);
  };

  return (
    <div ref={containerRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {kategoriList.map((k, idx) => {
        const isActive = active === k;
        const isDragging = dragging === idx;
        const isOver = overIndex === idx && dragging !== null && dragging !== idx;
        const isReorder = k === "Semua";

        return (
          <div
            key={k}
            draggable={!isReorder}
            onDragStart={() => !isReorder && handleDragStart(idx)}
            onDragOver={(e) => !isReorder && handleDragOver(e, idx)}
            onDrop={() => !isReorder && handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all touch-target select-none shrink-0 ${
              isDragging ? "opacity-40 scale-95" : ""
            } ${isOver ? "ring-2 ring-accent ring-offset-1" : ""} ${
              isActive
                ? "th-accent-bg text-white shadow-sm"
                : "th-card th-muted hover:th-text border th-border"
            }`}
          >
            {!isReorder && (
              <GripVertical size={12} className="opacity-40 cursor-grab active:cursor-grabbing shrink-0" />
            )}
            <button onClick={() => onSelect(k)} className="whitespace-nowrap">
              {k}
            </button>
          </div>
        );
      })}
    </div>
  );
}
