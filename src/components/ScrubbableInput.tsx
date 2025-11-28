'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ScrubbableInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  disabled?: boolean;
  warning?: boolean;
  className?: string;
}

export function ScrubbableInput({
  value,
  onChange,
  label,
  min = -Infinity,
  max = Infinity,
  step = 0.01,
  precision = 4,
  unit = '',
  disabled = false,
  warning = false,
  className = '',
}: ScrubbableInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const startX = useRef(0);
  const startValue = useRef(0);

  const formatValue = (v: number) => v.toFixed(precision);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || isEditing) return;
      e.preventDefault();
      setIsDragging(true);
      startX.current = e.clientX;
      startValue.current = value;
    },
    [disabled, isEditing, value]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      
      const delta = e.clientX - startX.current;
      let multiplier = step;
      
      // 修飾キーで精度調整
      if (e.shiftKey) {
        multiplier = step * 10;  // 大きく変化
      } else if (e.altKey) {
        multiplier = step * 0.1;  // 微調整
      }
      
      const newValue = clamp(startValue.current + delta * multiplier);
      onChange(newValue);
    },
    [isDragging, step, onChange, clamp]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(formatValue(value));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const borderColor = warning
    ? 'border-warning'
    : isDragging
    ? 'border-primary-500'
    : 'border-gray-300';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label
        className={`
          min-w-12 text-sm font-medium select-none
          ${disabled ? 'text-gray-400' : 'text-gray-700 cursor-ew-resize'}
        `}
        onMouseDown={handleMouseDown}
      >
        {label}
      </label>
      
      <div className={`relative flex-1`}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`
              w-full px-3 py-1.5 text-right font-mono text-sm
              border rounded-md outline-none
              focus:ring-2 focus:ring-primary-500 focus:border-transparent
              ${borderColor}
            `}
            autoFocus
          />
        ) : (
          <div
            className={`
              w-full px-3 py-1.5 text-right font-mono text-sm
              border rounded-md
              ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-white cursor-ew-resize'}
              ${borderColor}
              ${isDragging ? 'ring-2 ring-primary-500' : ''}
            `}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
          >
            {formatValue(value)}
            {unit && <span className="text-gray-400 ml-1">{unit}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
