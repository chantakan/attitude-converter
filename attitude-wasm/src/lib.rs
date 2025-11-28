//! # Attitude WASM Library
//!
//! 3次元回転表現の相互変換ライブラリ（WebAssembly版）

use std::f64::consts::PI;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

const EPSILON: f64 = 1e-10;
const GIMBAL_LOCK_THRESHOLD: f64 = 1e-6;

// =============================================================================
// JS向けデータ構造
// =============================================================================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct QuaternionData {
    pub w: f64,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EulerData {
    pub angle1: f64,
    pub angle2: f64,
    pub angle3: f64,
    pub order: String,
    pub gimbal_lock: Option<GimbalLockInfo>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GimbalLockInfo {
    pub lock_type: String,
    pub combined_angle: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MrpData {
    pub sigma1: f64,
    pub sigma2: f64,
    pub sigma3: f64,
    pub is_shadow: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AxisAngleData {
    pub axis: [f64; 3],
    pub angle: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RotationMatrixData {
    pub matrix: [[f64; 3]; 3],
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ConversionResult {
    pub quaternion: QuaternionData,
    pub euler: EulerData,
    pub mrp: MrpData,
    pub axis_angle: AxisAngleData,
    pub rotation_matrix: RotationMatrixData,
}

// =============================================================================
// 内部計算用構造体
// =============================================================================

#[derive(Clone, Debug)]
struct Quaternion {
    w: f64,
    x: f64,
    y: f64,
    z: f64,
}

impl Quaternion {
    fn new(w: f64, x: f64, y: f64, z: f64) -> Self {
        let mut q = Self { w, x, y, z };
        q.normalize();
        q
    }

    fn identity() -> Self {
        Self { w: 1.0, x: 0.0, y: 0.0, z: 0.0 }
    }

    fn from_axis_angle(axis: [f64; 3], angle: f64) -> Self {
        let half = angle / 2.0;
        let s = half.sin();
        let norm = (axis[0].powi(2) + axis[1].powi(2) + axis[2].powi(2)).sqrt();
        if norm < EPSILON {
            return Self::identity();
        }
        Self::new(half.cos(), axis[0]/norm*s, axis[1]/norm*s, axis[2]/norm*s)
    }

    fn norm(&self) -> f64 {
        (self.w.powi(2) + self.x.powi(2) + self.y.powi(2) + self.z.powi(2)).sqrt()
    }

    fn normalize(&mut self) {
        let n = self.norm();
        if n > EPSILON {
            self.w /= n; self.x /= n; self.y /= n; self.z /= n;
        }
        if self.w < 0.0 {
            self.w = -self.w; self.x = -self.x; self.y = -self.y; self.z = -self.z;
        }
    }

    fn to_rotation_matrix(&self) -> [[f64; 3]; 3] {
        let (w, x, y, z) = (self.w, self.x, self.y, self.z);
        [
            [1.0-2.0*(y*y+z*z), 2.0*(x*y-z*w), 2.0*(x*z+y*w)],
            [2.0*(x*y+z*w), 1.0-2.0*(x*x+z*z), 2.0*(y*z-x*w)],
            [2.0*(x*z-y*w), 2.0*(y*z+x*w), 1.0-2.0*(x*x+y*y)],
        ]
    }

    fn to_axis_angle(&self) -> ([f64; 3], f64) {
        let angle = 2.0 * self.w.clamp(-1.0, 1.0).acos();
        let s = (1.0 - self.w * self.w).sqrt();
        if s < EPSILON {
            ([1.0, 0.0, 0.0], 0.0)
        } else {
            ([self.x/s, self.y/s, self.z/s], angle)
        }
    }

    fn to_data(&self) -> QuaternionData {
        QuaternionData { w: self.w, x: self.x, y: self.y, z: self.z }
    }
}

// =============================================================================
// オイラー角
// =============================================================================

#[derive(Clone, Copy, Debug, PartialEq)]
enum EulerOrder {
    XYZ, XZY, YXZ, YZX, ZXY, ZYX,
    XYX, XZX, YXY, YZY, ZXZ, ZYZ,
}

impl EulerOrder {
    fn from_string(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "XYZ" => Some(Self::XYZ), "XZY" => Some(Self::XZY),
            "YXZ" => Some(Self::YXZ), "YZX" => Some(Self::YZX),
            "ZXY" => Some(Self::ZXY), "ZYX" => Some(Self::ZYX),
            "XYX" => Some(Self::XYX), "XZX" => Some(Self::XZX),
            "YXY" => Some(Self::YXY), "YZY" => Some(Self::YZY),
            "ZXZ" => Some(Self::ZXZ), "ZYZ" => Some(Self::ZYZ),
            _ => None,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::XYZ => "XYZ", Self::XZY => "XZY",
            Self::YXZ => "YXZ", Self::YZX => "YZX",
            Self::ZXY => "ZXY", Self::ZYX => "ZYX",
            Self::XYX => "XYX", Self::XZX => "XZX",
            Self::YXY => "YXY", Self::YZY => "YZY",
            Self::ZXZ => "ZXZ", Self::ZYZ => "ZYZ",
        }
    }
}

fn euler_to_quaternion(a1: f64, a2: f64, a3: f64, order: EulerOrder) -> Quaternion {
    let (c1, s1) = ((a1/2.0).cos(), (a1/2.0).sin());
    let (c2, s2) = ((a2/2.0).cos(), (a2/2.0).sin());
    let (c3, s3) = ((a3/2.0).cos(), (a3/2.0).sin());

    let (w, x, y, z) = match order {
        EulerOrder::XYZ => (c1*c2*c3-s1*s2*s3, s1*c2*c3+c1*s2*s3, c1*s2*c3-s1*c2*s3, c1*c2*s3+s1*s2*c3),
        EulerOrder::XZY => (c1*c2*c3+s1*s2*s3, s1*c2*c3-c1*s2*s3, c1*c2*s3-s1*s2*c3, c1*s2*c3+s1*c2*s3),
        EulerOrder::YXZ => (c1*c2*c3+s1*s2*s3, c1*s2*c3+s1*c2*s3, s1*c2*c3-c1*s2*s3, c1*c2*s3-s1*s2*c3),
        EulerOrder::YZX => (c1*c2*c3-s1*s2*s3, c1*c2*s3+s1*s2*c3, s1*c2*c3+c1*s2*s3, c1*s2*c3-s1*c2*s3),
        EulerOrder::ZXY => (c1*c2*c3-s1*s2*s3, c1*s2*c3-s1*c2*s3, c1*c2*s3+s1*s2*c3, s1*c2*c3+c1*s2*s3),
        EulerOrder::ZYX => (c1*c2*c3+s1*s2*s3, c1*c2*s3-s1*s2*c3, c1*s2*c3+s1*c2*s3, s1*c2*c3-c1*s2*s3),
        EulerOrder::XYX => (c1*c2*c3-s1*c2*s3, c1*c2*s3+s1*c2*c3, c1*s2*c3+s1*s2*s3, s1*s2*c3-c1*s2*s3),
        EulerOrder::XZX => (c1*c2*c3-s1*c2*s3, c1*c2*s3+s1*c2*c3, c1*s2*s3-s1*s2*c3, c1*s2*c3+s1*s2*s3),
        EulerOrder::YXY => (c1*c2*c3-s1*c2*s3, c1*s2*c3+s1*s2*s3, c1*c2*s3+s1*c2*c3, c1*s2*s3-s1*s2*c3),
        EulerOrder::YZY => (c1*c2*c3-s1*c2*s3, s1*s2*c3-c1*s2*s3, c1*c2*s3+s1*c2*c3, c1*s2*c3+s1*s2*s3),
        EulerOrder::ZXZ => (c1*c2*c3-s1*c2*s3, c1*s2*c3+s1*s2*s3, s1*s2*c3-c1*s2*s3, c1*c2*s3+s1*c2*c3),
        EulerOrder::ZYZ => (c1*c2*c3-s1*c2*s3, c1*s2*s3-s1*s2*c3, c1*s2*c3+s1*s2*s3, c1*c2*s3+s1*c2*c3),
    };
    Quaternion::new(w, x, y, z)
}

fn quaternion_to_euler(q: &Quaternion, order: EulerOrder) -> (f64, f64, f64, Option<GimbalLockInfo>) {
    let m = q.to_rotation_matrix();
    rotation_matrix_to_euler(&m, order)
}

fn rotation_matrix_to_euler(m: &[[f64; 3]; 3], order: EulerOrder) -> (f64, f64, f64, Option<GimbalLockInfo>) {
    let mut gimbal: Option<GimbalLockInfo> = None;
    
    let (a1, a2, a3) = match order {
        EulerOrder::XYZ => {
            let sin_a2 = m[0][2];
            if sin_a2.abs() >= 1.0 - GIMBAL_LOCK_THRESHOLD {
                let a2 = sin_a2.signum() * PI / 2.0;
                let a1 = (-m[1][0]).atan2(m[1][1]);
                gimbal = Some(GimbalLockInfo { lock_type: if a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                ((-m[1][2]).atan2(m[2][2]), sin_a2.asin(), (-m[0][1]).atan2(m[0][0]))
            }
        }
        EulerOrder::ZYX => {
            let sin_a2 = -m[2][0];
            if sin_a2.abs() >= 1.0 - GIMBAL_LOCK_THRESHOLD {
                let a2 = sin_a2.signum() * PI / 2.0;
                let a1 = (-m[0][1]).atan2(m[0][0]);
                gimbal = Some(GimbalLockInfo { lock_type: if a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[1][0].atan2(m[0][0]), sin_a2.asin(), m[2][1].atan2(m[2][2]))
            }
        }
        EulerOrder::XZY => {
            let sin_a2 = -m[0][1];
            if sin_a2.abs() >= 1.0 - GIMBAL_LOCK_THRESHOLD {
                let a2 = sin_a2.signum() * PI / 2.0;
                let a1 = m[2][0].atan2(m[2][2]);
                gimbal = Some(GimbalLockInfo { lock_type: if a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[2][1].atan2(m[1][1]), sin_a2.asin(), m[0][2].atan2(m[0][0]))
            }
        }
        EulerOrder::YXZ => {
            let sin_a2 = -m[1][2];
            if sin_a2.abs() >= 1.0 - GIMBAL_LOCK_THRESHOLD {
                let a2 = sin_a2.signum() * PI / 2.0;
                let a1 = (-m[0][1]).atan2(m[0][0]);
                gimbal = Some(GimbalLockInfo { lock_type: if a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[0][2].atan2(m[2][2]), sin_a2.asin(), m[1][0].atan2(m[1][1]))
            }
        }
        EulerOrder::YZX => {
            let sin_a2 = m[1][0];
            if sin_a2.abs() >= 1.0 - GIMBAL_LOCK_THRESHOLD {
                let a2 = sin_a2.signum() * PI / 2.0;
                let a1 = m[0][2].atan2(m[0][0]);
                gimbal = Some(GimbalLockInfo { lock_type: if a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                ((-m[2][0]).atan2(m[0][0]), sin_a2.asin(), (-m[1][2]).atan2(m[1][1]))
            }
        }
        EulerOrder::ZXY => {
            let sin_a2 = m[2][1];
            if sin_a2.abs() >= 1.0 - GIMBAL_LOCK_THRESHOLD {
                let a2 = sin_a2.signum() * PI / 2.0;
                let a1 = m[1][0].atan2(m[1][1]);
                gimbal = Some(GimbalLockInfo { lock_type: if a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                ((-m[0][1]).atan2(m[1][1]), sin_a2.asin(), (-m[2][0]).atan2(m[2][2]))
            }
        }
        EulerOrder::XYX => {
            let cos_a2 = m[0][0];
            if (1.0 - cos_a2.abs()) < GIMBAL_LOCK_THRESHOLD {
                let a2 = if cos_a2 > 0.0 { 0.0 } else { PI };
                let a1 = m[1][2].atan2(m[1][1]);
                gimbal = Some(GimbalLockInfo { lock_type: if cos_a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[1][0].atan2(-m[2][0]), cos_a2.acos(), m[0][1].atan2(m[0][2]))
            }
        }
        EulerOrder::XZX => {
            let cos_a2 = m[0][0];
            if (1.0 - cos_a2.abs()) < GIMBAL_LOCK_THRESHOLD {
                let a2 = if cos_a2 > 0.0 { 0.0 } else { PI };
                let a1 = (-m[2][1]).atan2(m[1][1]);
                gimbal = Some(GimbalLockInfo { lock_type: if cos_a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[2][0].atan2(m[1][0]), cos_a2.acos(), m[0][2].atan2(-m[0][1]))
            }
        }
        EulerOrder::YXY => {
            let cos_a2 = m[1][1];
            if (1.0 - cos_a2.abs()) < GIMBAL_LOCK_THRESHOLD {
                let a2 = if cos_a2 > 0.0 { 0.0 } else { PI };
                let a1 = (-m[0][2]).atan2(m[0][0]);
                gimbal = Some(GimbalLockInfo { lock_type: if cos_a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[0][1].atan2(m[2][1]), cos_a2.acos(), m[1][0].atan2(-m[1][2]))
            }
        }
        EulerOrder::YZY => {
            let cos_a2 = m[1][1];
            if (1.0 - cos_a2.abs()) < GIMBAL_LOCK_THRESHOLD {
                let a2 = if cos_a2 > 0.0 { 0.0 } else { PI };
                let a1 = m[2][0].atan2(m[0][0]);
                gimbal = Some(GimbalLockInfo { lock_type: if cos_a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[2][1].atan2(-m[0][1]), cos_a2.acos(), m[1][2].atan2(m[1][0]))
            }
        }
        EulerOrder::ZXZ => {
            let cos_a2 = m[2][2];
            if (1.0 - cos_a2.abs()) < GIMBAL_LOCK_THRESHOLD {
                let a2 = if cos_a2 > 0.0 { 0.0 } else { PI };
                let a1 = m[0][1].atan2(m[0][0]);
                gimbal = Some(GimbalLockInfo { lock_type: if cos_a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[0][2].atan2(-m[1][2]), cos_a2.acos(), m[2][0].atan2(m[2][1]))
            }
        }
        EulerOrder::ZYZ => {
            let cos_a2 = m[2][2];
            if (1.0 - cos_a2.abs()) < GIMBAL_LOCK_THRESHOLD {
                let a2 = if cos_a2 > 0.0 { 0.0 } else { PI };
                let a1 = (-m[1][0]).atan2(m[0][0]);
                gimbal = Some(GimbalLockInfo { lock_type: if cos_a2 > 0.0 { "positive".into() } else { "negative".into() }, combined_angle: a1 });
                (a1, a2, 0.0)
            } else {
                (m[1][2].atan2(m[0][2]), cos_a2.acos(), m[2][1].atan2(-m[2][0]))
            }
        }
    };
    (a1, a2, a3, gimbal)
}

// =============================================================================
// MRP変換
// =============================================================================

fn quaternion_to_mrp(q: &Quaternion, auto_shadow: bool) -> MrpData {
    let denom = 1.0 + q.w;
    if denom < EPSILON {
        let d = 1.0 - q.w;
        MrpData { sigma1: -q.x/d, sigma2: -q.y/d, sigma3: -q.z/d, is_shadow: true }
    } else {
        let (s1, s2, s3) = (q.x/denom, q.y/denom, q.z/denom);
        let norm_sq = s1*s1 + s2*s2 + s3*s3;
        if auto_shadow && norm_sq > 1.0 {
            MrpData { sigma1: -s1/norm_sq, sigma2: -s2/norm_sq, sigma3: -s3/norm_sq, is_shadow: true }
        } else {
            MrpData { sigma1: s1, sigma2: s2, sigma3: s3, is_shadow: false }
        }
    }
}

fn mrp_to_quaternion(mrp: &MrpData) -> Quaternion {
    let sq = mrp.sigma1.powi(2) + mrp.sigma2.powi(2) + mrp.sigma3.powi(2);
    let d = 1.0 + sq;
    Quaternion::new((1.0-sq)/d, 2.0*mrp.sigma1/d, 2.0*mrp.sigma2/d, 2.0*mrp.sigma3/d)
}

// =============================================================================
// 変換結果を作成するヘルパー
// =============================================================================

fn create_result(q: &Quaternion, order: EulerOrder, auto_shadow: bool) -> ConversionResult {
    let (a1, a2, a3, gimbal) = quaternion_to_euler(q, order);
    let (axis, angle) = q.to_axis_angle();
    ConversionResult {
        quaternion: q.to_data(),
        euler: EulerData { angle1: a1, angle2: a2, angle3: a3, order: order.as_str().to_string(), gimbal_lock: gimbal },
        mrp: quaternion_to_mrp(q, auto_shadow),
        axis_angle: AxisAngleData { axis, angle },
        rotation_matrix: RotationMatrixData { matrix: q.to_rotation_matrix() },
    }
}

// =============================================================================
// WASM エクスポート関数（JSON文字列を返す）
// =============================================================================

#[wasm_bindgen]
pub fn convert_from_quaternion(w: f64, x: f64, y: f64, z: f64, euler_order: &str, auto_shadow_mrp: bool) -> String {
    let q = Quaternion::new(w, x, y, z);
    let order = EulerOrder::from_string(euler_order).unwrap_or(EulerOrder::ZYX);
    serde_json::to_string(&create_result(&q, order, auto_shadow_mrp)).unwrap()
}

#[wasm_bindgen]
pub fn convert_from_euler(angle1: f64, angle2: f64, angle3: f64, euler_order: &str, auto_shadow_mrp: bool) -> String {
    let order = EulerOrder::from_string(euler_order).unwrap_or(EulerOrder::ZYX);
    let q = euler_to_quaternion(angle1, angle2, angle3, order);
    serde_json::to_string(&create_result(&q, order, auto_shadow_mrp)).unwrap()
}

#[wasm_bindgen]
pub fn convert_from_mrp(sigma1: f64, sigma2: f64, sigma3: f64, is_shadow: bool, euler_order: &str, auto_shadow_mrp: bool) -> String {
    let mrp = MrpData { sigma1, sigma2, sigma3, is_shadow };
    let q = mrp_to_quaternion(&mrp);
    let order = EulerOrder::from_string(euler_order).unwrap_or(EulerOrder::ZYX);
    serde_json::to_string(&create_result(&q, order, auto_shadow_mrp)).unwrap()
}

#[wasm_bindgen]
pub fn convert_from_axis_angle(axis_x: f64, axis_y: f64, axis_z: f64, angle: f64, euler_order: &str, auto_shadow_mrp: bool) -> String {
    let q = Quaternion::from_axis_angle([axis_x, axis_y, axis_z], angle);
    let order = EulerOrder::from_string(euler_order).unwrap_or(EulerOrder::ZYX);
    serde_json::to_string(&create_result(&q, order, auto_shadow_mrp)).unwrap()
}

#[wasm_bindgen]
pub fn degrees_to_radians(degrees: f64) -> f64 {
    degrees * PI / 180.0
}

#[wasm_bindgen]
pub fn radians_to_degrees(radians: f64) -> f64 {
    radians * 180.0 / PI
}

#[wasm_bindgen]
pub fn get_euler_orders() -> String {
    let orders = vec![
        ("XYZ", "Tait-Bryan", "Roll-Pitch-Yaw"),
        ("XZY", "Tait-Bryan", ""),
        ("YXZ", "Tait-Bryan", ""),
        ("YZX", "Tait-Bryan", ""),
        ("ZXY", "Tait-Bryan", ""),
        ("ZYX", "Tait-Bryan", "Yaw-Pitch-Roll (Aerospace)"),
        ("XYX", "Proper Euler", ""),
        ("XZX", "Proper Euler", ""),
        ("YXY", "Proper Euler", ""),
        ("YZY", "Proper Euler", ""),
        ("ZXZ", "Proper Euler", "Classical Euler (Precession)"),
        ("ZYZ", "Proper Euler", ""),
    ];
    serde_json::to_string(&orders).unwrap()
}

#[wasm_bindgen]
pub fn version() -> String {
    "0.1.0".to_string()
}

// =============================================================================
// テスト
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64, tol: f64) -> bool {
        (a - b).abs() < tol
    }

    #[test]
    fn test_quaternion_identity() {
        let q = Quaternion::identity();
        assert!(approx_eq(q.w, 1.0, 1e-10));
    }

    #[test]
    fn test_euler_roundtrip() {
        let q = Quaternion::from_axis_angle([1.0, 2.0, 3.0], PI / 5.0);
        for order in [EulerOrder::ZYX, EulerOrder::XYZ, EulerOrder::ZXZ] {
            let (a1, a2, a3, _) = quaternion_to_euler(&q, order);
            let q2 = euler_to_quaternion(a1, a2, a3, order);
            let same = approx_eq(q.w, q2.w, 1e-6) && approx_eq(q.x, q2.x, 1e-6);
            let neg = approx_eq(q.w, -q2.w, 1e-6) && approx_eq(q.x, -q2.x, 1e-6);
            assert!(same || neg, "Failed for {:?}", order);
        }
    }

    #[test]
    fn test_mrp_roundtrip() {
        let q = Quaternion::from_axis_angle([0.0, 1.0, 0.0], PI / 4.0);
        let mrp = quaternion_to_mrp(&q, true);
        let q2 = mrp_to_quaternion(&mrp);
        assert!(approx_eq(q.w, q2.w, 1e-10));
    }
}