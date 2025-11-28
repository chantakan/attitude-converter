/* tslint:disable */
/* eslint-disable */
export function convert_from_quaternion(w: number, x: number, y: number, z: number, euler_order: string, auto_shadow_mrp: boolean): string;
export function convert_from_euler(angle1: number, angle2: number, angle3: number, euler_order: string, auto_shadow_mrp: boolean): string;
export function convert_from_mrp(sigma1: number, sigma2: number, sigma3: number, is_shadow: boolean, euler_order: string, auto_shadow_mrp: boolean): string;
export function convert_from_axis_angle(axis_x: number, axis_y: number, axis_z: number, angle: number, euler_order: string, auto_shadow_mrp: boolean): string;
export function degrees_to_radians(degrees: number): number;
export function radians_to_degrees(radians: number): number;
export function get_euler_orders(): string;
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly convert_from_quaternion: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
  readonly convert_from_euler: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly convert_from_mrp: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
  readonly convert_from_axis_angle: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
  readonly degrees_to_radians: (a: number) => number;
  readonly radians_to_degrees: (a: number) => number;
  readonly get_euler_orders: () => [number, number];
  readonly version: () => [number, number];
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
