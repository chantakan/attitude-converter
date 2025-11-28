// WASMモジュールの型定義

export interface QuaternionData {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface GimbalLockInfo {
  lock_type: 'positive' | 'negative';
  combined_angle: number;
}

export interface EulerData {
  angle1: number;
  angle2: number;
  angle3: number;
  order: string;
  gimbal_lock: GimbalLockInfo | null;
}

export interface MrpData {
  sigma1: number;
  sigma2: number;
  sigma3: number;
  is_shadow: boolean;
}

export interface AxisAngleData {
  axis: [number, number, number];
  angle: number;
}

export interface RotationMatrixData {
  matrix: [[number, number, number], [number, number, number], [number, number, number]];
}

export interface ConversionResult {
  quaternion: QuaternionData;
  euler: EulerData;
  mrp: MrpData;
  axis_angle: AxisAngleData;
  rotation_matrix: RotationMatrixData;
}

export type EulerOrderTuple = [string, string, string];

export interface AttitudeWasm {
  convert_from_quaternion(
    w: number,
    x: number,
    y: number,
    z: number,
    euler_order: string,
    auto_shadow_mrp: boolean
  ): ConversionResult;

  convert_from_euler(
    angle1: number,
    angle2: number,
    angle3: number,
    euler_order: string,
    auto_shadow_mrp: boolean
  ): ConversionResult;

  convert_from_mrp(
    sigma1: number,
    sigma2: number,
    sigma3: number,
    is_shadow: boolean,
    euler_order: string,
    auto_shadow_mrp: boolean
  ): ConversionResult;

  convert_from_axis_angle(
    axis_x: number,
    axis_y: number,
    axis_z: number,
    angle: number,
    euler_order: string,
    auto_shadow_mrp: boolean
  ): ConversionResult;

  degrees_to_radians(degrees: number): number;
  radians_to_degrees(radians: number): number;
  get_euler_orders(): EulerOrderTuple[];
  version(): string;
}

declare const init: () => Promise<AttitudeWasm>;
export default init;
