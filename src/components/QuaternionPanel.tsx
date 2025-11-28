'use client';

import { useState } from 'react';
import { ScrubbableInput } from './ScrubbableInput';
import type { QuaternionData } from '@/types/wasm.d';

interface QuaternionPanelProps {
  quaternion: QuaternionData;
  onUpdate: (w: number, x: number, y: number, z: number) => void;
  disabled?: boolean;
}

type QuatFormat = 'wxyz' | 'xyzw';

export function QuaternionPanel({ quaternion, onUpdate, disabled = false }: QuaternionPanelProps) {
  const [format, setFormat] = useState<QuatFormat>('wxyz');
  const { w, x, y, z } = quaternion;
  
  // ノルム計算
  const norm = Math.sqrt(w * w + x * x + y * y + z * z);
  const isNormalized = Math.abs(norm - 1) < 0.001;

  const handleChange = (component: 'w' | 'x' | 'y' | 'z', value: number) => {
    const newQ = { w, x, y, z, [component]: value };
    onUpdate(newQ.w, newQ.x, newQ.y, newQ.z);
  };

  const handleNormalize = () => {
    if (norm > 0.0001) {
      onUpdate(w / norm, x / norm, y / norm, z / norm);
    }
  };

  const handleNegate = () => {
    onUpdate(-w, -x, -y, -z);
  };

  const handleConjugate = () => {
    onUpdate(w, -x, -y, -z);
  };

  const renderInputs = () => {
    const components = format === 'wxyz' 
      ? [
          { key: 'w', label: 'w', value: w },
          { key: 'x', label: 'x', value: x },
          { key: 'y', label: 'y', value: y },
          { key: 'z', label: 'z', value: z },
        ]
      : [
          { key: 'x', label: 'x', value: x },
          { key: 'y', label: 'y', value: y },
          { key: 'z', label: 'z', value: z },
          { key: 'w', label: 'w', value: w },
        ];

    return components.map(({ key, label, value }) => (
      <ScrubbableInput
        key={key}
        label={label}
        value={value}
        onChange={(v) => handleChange(key as 'w' | 'x' | 'y' | 'z', v)}
        min={-1}
        max={1}
        step={0.001}
        precision={6}
        disabled={disabled}
      />
    ));
  };

  return (
    <div className="panel space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Quaternion</h3>
        <div className="flex items-center gap-2">
          <button
            className={`text-xs px-2 py-1 rounded ${format === 'wxyz' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setFormat('wxyz')}
          >
            (w,x,y,z)
          </button>
          <button
            className={`text-xs px-2 py-1 rounded ${format === 'xyzw' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setFormat('xyzw')}
          >
            (x,y,z,w)
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {renderInputs()}
      </div>

      {/* ノルム表示 */}
      <div className={`text-xs flex items-center gap-2 ${isNormalized ? 'text-gray-500' : 'text-warning'}`}>
        <span>|q| = {norm.toFixed(6)}</span>
        {!isNormalized && (
          <span className="text-warning">⚠️ Not normalized</span>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button
          className="btn-secondary text-xs flex-1"
          onClick={handleNormalize}
          disabled={disabled || isNormalized}
        >
          Normalize
        </button>
        <button
          className="btn-secondary text-xs flex-1"
          onClick={handleNegate}
          disabled={disabled}
          title="q と -q は同じ回転を表す"
        >
          Negate
        </button>
        <button
          className="btn-secondary text-xs flex-1"
          onClick={handleConjugate}
          disabled={disabled}
          title="共役クォータニオン（逆回転）"
        >
          Conjugate
        </button>
      </div>
    </div>
  );
}
