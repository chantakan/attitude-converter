'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ConversionResult } from '@/types/wasm.d';

// WASM関数の型定義
interface WasmExports {
  convert_from_quaternion: (
    w: number, x: number, y: number, z: number,
    euler_order: string, auto_shadow_mrp: boolean
  ) => string;
  convert_from_euler: (
    angle1: number, angle2: number, angle3: number,
    euler_order: string, auto_shadow_mrp: boolean
  ) => string;
  convert_from_mrp: (
    sigma1: number, sigma2: number, sigma3: number,
    is_shadow: boolean, euler_order: string, auto_shadow_mrp: boolean
  ) => string;
  convert_from_axis_angle: (
    axis_x: number, axis_y: number, axis_z: number, angle: number,
    euler_order: string, auto_shadow_mrp: boolean
  ) => string;
  degrees_to_radians: (degrees: number) => number;
  radians_to_degrees: (radians: number) => number;
  get_euler_orders: () => string;
  version: () => string;
}

interface UseAttitudeReturn {
  isLoading: boolean;
  error: Error | null;
  convertFromQuaternion: (
    w: number, x: number, y: number, z: number,
    eulerOrder?: string, autoShadow?: boolean
  ) => ConversionResult | null;
  convertFromEuler: (
    angle1: number, angle2: number, angle3: number,
    eulerOrder?: string, autoShadow?: boolean
  ) => ConversionResult | null;
  convertFromMrp: (
    sigma1: number, sigma2: number, sigma3: number,
    isShadow?: boolean, eulerOrder?: string, autoShadow?: boolean
  ) => ConversionResult | null;
  convertFromAxisAngle: (
    axisX: number, axisY: number, axisZ: number, angle: number,
    eulerOrder?: string, autoShadow?: boolean
  ) => ConversionResult | null;
  degToRad: (deg: number) => number;
  radToDeg: (rad: number) => number;
  getEulerOrders: () => [string, string, string][];
}

// グローバルでWASMモジュールをキャッシュ
let wasmCache: WasmExports | null = null;
let wasmLoadPromise: Promise<WasmExports> | null = null;

async function loadWasmModule(): Promise<WasmExports> {
  if (wasmCache) return wasmCache;
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = (async () => {
    // wasm-bindgen生成のJSをインポート
    // @ts-expect-error - dynamic import from public directory
    const wasm = await import(/* webpackIgnore: true */ '/wasm/attitude_wasm.js');
    
    // WASMバイナリをfetchしてArrayBufferとして渡す
    const wasmResponse = await fetch('/wasm/attitude_wasm_bg.wasm');
    const wasmBuffer = await wasmResponse.arrayBuffer();
    
    await wasm.default(wasmBuffer);
    wasmCache = wasm as unknown as WasmExports;
    return wasmCache;
  })();

  return wasmLoadPromise;
}

export function useAttitude(): UseAttitudeReturn {
  const [wasm, setWasm] = useState<WasmExports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    loadWasmModule()
      .then((module) => {
        if (mounted) {
          setWasm(module);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('WASM load error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load WASM'));
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const convertFromQuaternion = useCallback(
    (w: number, x: number, y: number, z: number, eulerOrder = 'ZYX', autoShadow = true) => {
      if (!wasm) return null;
      const json = wasm.convert_from_quaternion(w, x, y, z, eulerOrder, autoShadow);
      return JSON.parse(json) as ConversionResult;
    },
    [wasm]
  );

  const convertFromEuler = useCallback(
    (angle1: number, angle2: number, angle3: number, eulerOrder = 'ZYX', autoShadow = true) => {
      if (!wasm) return null;
      const json = wasm.convert_from_euler(angle1, angle2, angle3, eulerOrder, autoShadow);
      return JSON.parse(json) as ConversionResult;
    },
    [wasm]
  );

  const convertFromMrp = useCallback(
    (sigma1: number, sigma2: number, sigma3: number, isShadow = false, eulerOrder = 'ZYX', autoShadow = true) => {
      if (!wasm) return null;
      const json = wasm.convert_from_mrp(sigma1, sigma2, sigma3, isShadow, eulerOrder, autoShadow);
      return JSON.parse(json) as ConversionResult;
    },
    [wasm]
  );

  const convertFromAxisAngle = useCallback(
    (axisX: number, axisY: number, axisZ: number, angle: number, eulerOrder = 'ZYX', autoShadow = true) => {
      if (!wasm) return null;
      const json = wasm.convert_from_axis_angle(axisX, axisY, axisZ, angle, eulerOrder, autoShadow);
      return JSON.parse(json) as ConversionResult;
    },
    [wasm]
  );

  const degToRad = useCallback(
    (deg: number) => wasm?.degrees_to_radians(deg) ?? (deg * Math.PI / 180),
    [wasm]
  );

  const radToDeg = useCallback(
    (rad: number) => wasm?.radians_to_degrees(rad) ?? (rad * 180 / Math.PI),
    [wasm]
  );

  const getEulerOrders = useCallback(
    () => {
      if (!wasm) return [];
      const json = wasm.get_euler_orders();
      return JSON.parse(json) as [string, string, string][];
    },
    [wasm]
  );

  return {
    isLoading,
    error,
    convertFromQuaternion,
    convertFromEuler,
    convertFromMrp,
    convertFromAxisAngle,
    degToRad,
    radToDeg,
    getEulerOrders,
  };
}