'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAttitude } from './useAttitude';
import type { ConversionResult } from '@/types/wasm.d';

export type InputSource = 'quaternion' | 'euler' | 'mrp' | 'axis_angle' | 'gizmo';

interface RotationState {
  result: ConversionResult | null;
  eulerOrder: string;
  useDegrees: boolean;
  autoShadowMrp: boolean;
  lastInputSource: InputSource;
}

interface UseRotationStateReturn extends RotationState {
  isLoading: boolean;
  error: Error | null;
  setEulerOrder: (order: string) => void;
  setUseDegrees: (use: boolean) => void;
  setAutoShadowMrp: (auto: boolean) => void;
  updateFromQuaternion: (w: number, x: number, y: number, z: number) => void;
  updateFromEuler: (angle1: number, angle2: number, angle3: number) => void;
  updateFromMrp: (sigma1: number, sigma2: number, sigma3: number, isShadow?: boolean) => void;
  updateFromAxisAngle: (axisX: number, axisY: number, axisZ: number, angle: number) => void;
  getEulerOrders: () => [string, string, string][];
  degToRad: (deg: number) => number;
  radToDeg: (rad: number) => number;
}

const DEFAULT_RESULT: ConversionResult = {
  quaternion: { w: 1, x: 0, y: 0, z: 0 },
  euler: { angle1: 0, angle2: 0, angle3: 0, order: 'ZYX', gimbal_lock: null },
  mrp: { sigma1: 0, sigma2: 0, sigma3: 0, is_shadow: false },
  axis_angle: { axis: [0, 0, 1], angle: 0 },
  rotation_matrix: {
    matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  },
};

export function useRotationState(): UseRotationStateReturn {
  const {
    isLoading,
    error,
    convertFromQuaternion,
    convertFromEuler,
    convertFromMrp,
    convertFromAxisAngle,
    getEulerOrders,
    degToRad,
    radToDeg,
  } = useAttitude();

  const [state, setState] = useState<RotationState>({
    result: null,
    eulerOrder: 'ZYX',
    useDegrees: true,
    autoShadowMrp: true,
    lastInputSource: 'quaternion',
  });

  // 初期化
  useEffect(() => {
    if (!isLoading && !state.result) {
      const result = convertFromQuaternion(1, 0, 0, 0, state.eulerOrder, state.autoShadowMrp);
      if (result) {
        setState((prev) => ({ ...prev, result }));
      }
    }
  }, [isLoading, state.result, state.eulerOrder, state.autoShadowMrp, convertFromQuaternion]);

  const setEulerOrder = useCallback((order: string) => {
    setState((prev) => {
      // オーダー変更時は現在の姿勢を維持して再計算
      if (prev.result) {
        const { w, x, y, z } = prev.result.quaternion;
        const newResult = convertFromQuaternion(w, x, y, z, order, prev.autoShadowMrp);
        return { ...prev, eulerOrder: order, result: newResult ?? prev.result };
      }
      return { ...prev, eulerOrder: order };
    });
  }, [convertFromQuaternion]);

  const setUseDegrees = useCallback((use: boolean) => {
    setState((prev) => ({ ...prev, useDegrees: use }));
  }, []);

  const setAutoShadowMrp = useCallback((auto: boolean) => {
    setState((prev) => {
      if (prev.result) {
        const { w, x, y, z } = prev.result.quaternion;
        const newResult = convertFromQuaternion(w, x, y, z, prev.eulerOrder, auto);
        return { ...prev, autoShadowMrp: auto, result: newResult ?? prev.result };
      }
      return { ...prev, autoShadowMrp: auto };
    });
  }, [convertFromQuaternion]);

  const updateFromQuaternion = useCallback(
    (w: number, x: number, y: number, z: number) => {
      const result = convertFromQuaternion(w, x, y, z, state.eulerOrder, state.autoShadowMrp);
      if (result) {
        setState((prev) => ({ ...prev, result, lastInputSource: 'quaternion' }));
      }
    },
    [convertFromQuaternion, state.eulerOrder, state.autoShadowMrp]
  );

  const updateFromEuler = useCallback(
    (angle1: number, angle2: number, angle3: number) => {
      const result = convertFromEuler(angle1, angle2, angle3, state.eulerOrder, state.autoShadowMrp);
      if (result) {
        setState((prev) => ({ ...prev, result, lastInputSource: 'euler' }));
      }
    },
    [convertFromEuler, state.eulerOrder, state.autoShadowMrp]
  );

  const updateFromMrp = useCallback(
    (sigma1: number, sigma2: number, sigma3: number, isShadow = false) => {
      const result = convertFromMrp(sigma1, sigma2, sigma3, isShadow, state.eulerOrder, state.autoShadowMrp);
      if (result) {
        setState((prev) => ({ ...prev, result, lastInputSource: 'mrp' }));
      }
    },
    [convertFromMrp, state.eulerOrder, state.autoShadowMrp]
  );

  const updateFromAxisAngle = useCallback(
    (axisX: number, axisY: number, axisZ: number, angle: number) => {
      const result = convertFromAxisAngle(axisX, axisY, axisZ, angle, state.eulerOrder, state.autoShadowMrp);
      if (result) {
        setState((prev) => ({ ...prev, result, lastInputSource: 'axis_angle' }));
      }
    },
    [convertFromAxisAngle, state.eulerOrder, state.autoShadowMrp]
  );

  return {
    ...state,
    result: state.result ?? DEFAULT_RESULT,
    isLoading,
    error,
    setEulerOrder,
    setUseDegrees,
    setAutoShadowMrp,
    updateFromQuaternion,
    updateFromEuler,
    updateFromMrp,
    updateFromAxisAngle,
    getEulerOrders,
    degToRad,
    radToDeg,
  };
}
