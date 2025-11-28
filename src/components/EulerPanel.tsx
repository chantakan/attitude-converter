'use client';

import { ScrubbableInput } from './ScrubbableInput';
import type { EulerData } from '@/types/wasm.d';

interface EulerPanelProps {
  euler: EulerData;
  eulerOrder: string;
  useDegrees: boolean;
  eulerOrders: [string, string, string][];
  onUpdate: (angle1: number, angle2: number, angle3: number) => void;
  onOrderChange: (order: string) => void;
  onUseDegreesChange: (use: boolean) => void;
  degToRad: (deg: number) => number;
  radToDeg: (rad: number) => number;
  disabled?: boolean;
}

export function EulerPanel({
  euler,
  eulerOrder,
  useDegrees,
  eulerOrders,
  onUpdate,
  onOrderChange,
  onUseDegreesChange,
  degToRad,
  radToDeg,
  disabled = false,
}: EulerPanelProps) {
  const { angle1, angle2, angle3, gimbal_lock } = euler;

  // 表示用の値（度またはラジアン）
  const displayValue = (rad: number) => (useDegrees ? radToDeg(rad) : rad);
  const toRadians = (val: number) => (useDegrees ? degToRad(val) : val);

  const handleChange = (index: 1 | 2 | 3, value: number) => {
    const rad = toRadians(value);
    if (index === 1) onUpdate(rad, angle2, angle3);
    else if (index === 2) onUpdate(angle1, rad, angle3);
    else onUpdate(angle1, angle2, rad);
  };

  // Tait-Bryan角かProper Euler角か
  const taitBryanOrders = eulerOrders.filter(([_, type]) => type === 'Tait-Bryan');
  const properEulerOrders = eulerOrders.filter(([_, type]) => type === 'Proper Euler');

  // 軸ラベル
  const axisLabels = eulerOrder.split('');

  return (
    <div className="panel space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Euler Angles</h3>
        <div className="flex items-center gap-2">
          <button
            className={`text-xs px-2 py-1 rounded ${useDegrees ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => onUseDegreesChange(true)}
          >
            deg
          </button>
          <button
            className={`text-xs px-2 py-1 rounded ${!useDegrees ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => onUseDegreesChange(false)}
          >
            rad
          </button>
        </div>
      </div>

      {/* 回転順序セレクター */}
      <div className="space-y-1">
        <label className="text-xs text-gray-600">Rotation Order</label>
        <select
          value={eulerOrder}
          onChange={(e) => onOrderChange(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
          disabled={disabled}
        >
          <optgroup label="Tait-Bryan (Gimbal Lock: ±90°)">
            {taitBryanOrders.map(([order, _, desc]) => (
              <option key={order} value={order}>
                {order} {desc && `- ${desc}`}
              </option>
            ))}
          </optgroup>
          <optgroup label="Proper Euler (Gimbal Lock: 0°, 180°)">
            {properEulerOrders.map(([order, _, desc]) => (
              <option key={order} value={order}>
                {order} {desc && `- ${desc}`}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* 角度入力 */}
      <div className="space-y-2">
        <ScrubbableInput
          label={axisLabels[0]}
          value={displayValue(angle1)}
          onChange={(v) => handleChange(1, v)}
          step={useDegrees ? 1 : 0.01}
          precision={useDegrees ? 2 : 4}
          unit={useDegrees ? '°' : ''}
          disabled={disabled}
        />
        <ScrubbableInput
          label={axisLabels[1]}
          value={displayValue(angle2)}
          onChange={(v) => handleChange(2, v)}
          step={useDegrees ? 1 : 0.01}
          precision={useDegrees ? 2 : 4}
          unit={useDegrees ? '°' : ''}
          disabled={disabled}
          warning={gimbal_lock !== null}
        />
        <ScrubbableInput
          label={axisLabels[2]}
          value={displayValue(angle3)}
          onChange={(v) => handleChange(3, v)}
          step={useDegrees ? 1 : 0.01}
          precision={useDegrees ? 2 : 4}
          unit={useDegrees ? '°' : ''}
          disabled={disabled}
        />
      </div>

      {/* ジンバルロック警告 */}
      {gimbal_lock && (
        <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/30 rounded-md">
          <span className="text-warning text-lg">⚠️</span>
          <div className="text-xs">
            <div className="font-medium text-warning">Gimbal Lock Detected</div>
            <div className="text-gray-600">
              {gimbal_lock.lock_type === 'positive' ? '+90°' : '-90°'} lock
              <br />
              Combined angle: {(gimbal_lock.combined_angle * 180 / Math.PI).toFixed(2)}°
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
