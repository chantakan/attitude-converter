# attitude-wasm

3次元回転表現の相互変換ライブラリ（WebAssembly版）

## 対応フォーマット

| 形式 | パラメータ数 | 特異点 |
|------|-------------|--------|
| **Euler Angles** | 3 (+ 順序) | ジンバルロック |
| **Quaternion** | 4 (w,x,y,z) | なし |
| **MRP** | 3 | 360° (シャドウセットで回避可能) |
| **Axis-Angle** | 4 (軸3 + 角度1) | 0°で軸が不定 |
| **Rotation Matrix** | 9 (3×3) | なし |

## オイラー角の12種類の順序

### Tait-Bryan角（ジンバルロック: ±90°）
- XYZ, XZY, YXZ, YZX, ZXY, **ZYX** (航空宇宙標準)

### 固有オイラー角（ジンバルロック: 0°, 180°）
- XYX, XZX, YXY, YZY, **ZXZ** (歳差運動), ZYZ

## ビルド方法

### 前提条件
```bash
# wasm-packのインストール
cargo install wasm-pack

# または直接インストール
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### WASMビルド
```bash
# web向け（ESモジュール）
wasm-pack build --target web --release

# bundler向け（webpack等）
wasm-pack build --target bundler --release

# Node.js向け
wasm-pack build --target nodejs --release
```

### 出力ファイル
```
pkg/
├── attitude_wasm.js       # JSグルーコード
├── attitude_wasm_bg.wasm  # WASMバイナリ
├── attitude_wasm.d.ts     # TypeScript型定義
└── package.json
```

## JavaScript API

### 基本的な使用方法

```typescript
import init, {
  convert_from_quaternion,
  convert_from_euler,
  convert_from_mrp,
  convert_from_axis_angle,
  degrees_to_radians,
  radians_to_degrees,
  get_euler_orders,
} from './pkg/attitude_wasm.js';

// WASM初期化
await init();

// クォータニオンから変換
const result = convert_from_quaternion(
  0.924,  // w
  0.0,    // x  
  0.0,    // y
  0.383,  // z
  "ZYX",  // オイラー角の順序
  true    // MRPのシャドウセット自動切替
);

console.log(result);
// {
//   quaternion: { w: 0.924, x: 0, y: 0, z: 0.383 },
//   euler: { angle1: 0.785, angle2: 0, angle3: 0, order: "ZYX", gimbal_lock: null },
//   mrp: { sigma1: 0, sigma2: 0, sigma3: 0.199, is_shadow: false },
//   axis_angle: { axis: [0, 0, 1], angle: 0.785 },
//   rotation_matrix: { matrix: [[...], [...], [...]] }
// }
```

### オイラー角から変換

```typescript
// 45度のZ軸回転（ZYX順序）
const euler_result = convert_from_euler(
  degrees_to_radians(45),  // angle1 (yaw)
  0,                        // angle2 (pitch)
  0,                        // angle3 (roll)
  "ZYX",
  true
);

// ジンバルロック検出
const gimbal_result = convert_from_euler(
  0,
  degrees_to_radians(90),  // pitch = 90° でジンバルロック
  0,
  "ZYX",
  true
);

if (gimbal_result.euler.gimbal_lock) {
  console.warn("⚠️ Gimbal lock detected!");
}
```

### MRPから変換（シャドウセット対応）

```typescript
const mrp_result = convert_from_mrp(
  0.2,    // sigma1
  0.1,    // sigma2
  0.3,    // sigma3
  false,  // is_shadow
  "ZYX",
  true    // auto_shadow_mrp
);
```

### 利用可能なオイラー角順序を取得

```typescript
const orders = get_euler_orders();
// [
//   ["XYZ", "Tait-Bryan", "Roll → Pitch → Yaw"],
//   ["ZYX", "Tait-Bryan", "Yaw → Pitch → Roll (Aerospace)"],
//   ["ZXZ", "Proper Euler", "Classical Euler (Precession)"],
//   ...
// ]
```

## TypeScript型定義

```typescript
interface QuaternionData {
  w: number;
  x: number;
  y: number;
  z: number;
}

interface EulerData {
  angle1: number;  // ラジアン
  angle2: number;
  angle3: number;
  order: string;
  gimbal_lock: GimbalLockInfo | null;
}

interface GimbalLockInfo {
  lock_type: "positive" | "negative";
  combined_angle: number;
}

interface MrpData {
  sigma1: number;
  sigma2: number;
  sigma3: number;
  is_shadow: boolean;
}

interface AxisAngleData {
  axis: [number, number, number];
  angle: number;  // ラジアン
}

interface RotationMatrixData {
  matrix: [[number, number, number], [number, number, number], [number, number, number]];
}

interface ConversionResult {
  quaternion: QuaternionData;
  euler: EulerData;
  mrp: MrpData;
  axis_angle: AxisAngleData;
  rotation_matrix: RotationMatrixData;
}
```

## Next.js/React統合例

```tsx
// hooks/useAttitude.ts
import { useEffect, useState } from 'react';

export function useAttitude() {
  const [wasm, setWasm] = useState<typeof import('../pkg/attitude_wasm') | null>(null);

  useEffect(() => {
    (async () => {
      const module = await import('../pkg/attitude_wasm');
      await module.default();
      setWasm(module);
    })();
  }, []);

  return wasm;
}

// components/RotationConverter.tsx
function RotationConverter() {
  const wasm = useAttitude();
  const [result, setResult] = useState(null);

  const handleConvert = () => {
    if (!wasm) return;
    
    const r = wasm.convert_from_euler(
      Math.PI / 4, 0, 0, "ZYX", true
    );
    setResult(r);
  };

  return (
    <div>
      <button onClick={handleConvert} disabled={!wasm}>
        Convert
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

## テスト

```bash
cargo test
```

## ライセンス

MIT
