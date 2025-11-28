'use client';

import { ScrubbableInput } from './ScrubbableInput';
import type { MrpData } from '@/types/wasm.d';

interface MrpPanelProps {
  mrp: MrpData;
  autoShadow: boolean;
  onUpdate: (sigma1: number, sigma2: number, sigma3: number, isShadow?: boolean) => void;
  onAutoShadowChange: (auto: boolean) => void;
  disabled?: boolean;
}

export function MrpPanel({
  mrp,
  autoShadow,
  onUpdate,
  onAutoShadowChange,
  disabled = false,
}: MrpPanelProps) {
  const { sigma1, sigma2, sigma3, is_shadow } = mrp;
  
  // |σ|²を計算
  const normSq = sigma1 * sigma1 + sigma2 * sigma2 + sigma3 * sigma3;
  const nearSingularity = normSq > 0.8;
  const inShadowRegion = normSq > 1.0;

  const handleChange = (component: 'sigma1' | 'sigma2' | 'sigma3', value: number) => {
    const newMrp = { sigma1, sigma2, sigma3, [component]: value };
    onUpdate(newMrp.sigma1, newMrp.sigma2, newMrp.sigma3, is_shadow);
  };

  const handleSwitchToShadow = () => {
    if (normSq > 0.0001) {
      // Shadow set: σ' = -σ / |σ|²
      onUpdate(
        -sigma1 / normSq,
        -sigma2 / normSq,
        -sigma3 / normSq,
        !is_shadow
      );
    }
  };

  return (
    <div className={`panel space-y-3 ${is_shadow ? 'bg-purple-50 border-purple-200' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          MRP
          {is_shadow && (
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              Shadow Set
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoShadow}
              onChange={(e) => onAutoShadowChange(e.target.checked)}
              className="rounded text-primary-500"
            />
            Auto Shadow
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <ScrubbableInput
          label="σ₁"
          value={sigma1}
          onChange={(v) => handleChange('sigma1', v)}
          step={0.01}
          precision={6}
          disabled={disabled}
        />
        <ScrubbableInput
          label="σ₂"
          value={sigma2}
          onChange={(v) => handleChange('sigma2', v)}
          step={0.01}
          precision={6}
          disabled={disabled}
        />
        <ScrubbableInput
          label="σ₃"
          value={sigma3}
          onChange={(v) => handleChange('sigma3', v)}
          step={0.01}
          precision={6}
          disabled={disabled}
        />
      </div>

      {/* ステータス表示 */}
      <div className="text-xs space-y-1">
        <div className={`flex items-center gap-2 ${nearSingularity ? 'text-warning' : 'text-gray-500'}`}>
          <span>|σ|² = {normSq.toFixed(4)}</span>
          {nearSingularity && !inShadowRegion && (
            <span className="text-warning">⚠️ Near singularity</span>
          )}
          {inShadowRegion && !autoShadow && (
            <span className="text-error">⚠️ In shadow region</span>
          )}
        </div>
      </div>

      {/* Shadow Set切り替えボタン */}
      <div className="pt-2 border-t border-gray-200">
        <button
          className="btn-secondary text-xs w-full"
          onClick={handleSwitchToShadow}
          disabled={disabled}
          title="手動でShadow Setに切り替え（同じ回転を表す）"
        >
          Switch to {is_shadow ? 'Primary' : 'Shadow'} Set
        </button>
      </div>

      {/* MRP説明 */}
      <div className="text-xs text-gray-500 border-t border-gray-200 pt-2">
        <details>
          <summary className="cursor-pointer hover:text-gray-700">What is MRP?</summary>
          <p className="mt-1">
            Modified Rodrigues Parameters: σ = e·tan(θ/4)
            <br />
            Singularity at ±360°. Shadow set avoids this by keeping |σ|² ≤ 1.
          </p>
        </details>
      </div>
    </div>
  );
}
