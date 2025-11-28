'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PivotControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { QuaternionData } from '@/types/wasm.d';

interface ViewportProps {
  quaternion: QuaternionData;
  onRotationChange?: (q: QuaternionData) => void;
  showGizmo?: boolean;
  showGrid?: boolean;
}

// 航空機風のモデル
function AircraftModel({ quaternion }: { quaternion: QuaternionData }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.quaternion.set(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );
    }
  });

  return (
    <group ref={meshRef}>
      {/* 胴体 */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 2, 16]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
      
      {/* 機首（コーン） - 赤でX軸正方向を示す */}
      <mesh position={[0, 1.2, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.15, 0.4, 16]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
      
      {/* 主翼 */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.05, 2.5, 0.4]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
      
      {/* 尾翼（垂直） */}
      <mesh position={[0, -0.8, 0.25]}>
        <boxGeometry args={[0.05, 0.5, 0.4]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
      
      {/* 尾翼（水平） */}
      <mesh position={[0, -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.05, 0.8, 0.2]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>

      {/* 機体座標軸 */}
      <axesHelper args={[1.5]} />
    </group>
  );
}

function Scene({ quaternion, onRotationChange, showGizmo, showGrid }: ViewportProps) {
  const handleDrag = (matrix: THREE.Matrix4) => {
    if (onRotationChange) {
      const q = new THREE.Quaternion();
      matrix.decompose(new THREE.Vector3(), q, new THREE.Vector3());
      onRotationChange({
        w: q.w,
        x: q.x,
        y: q.y,
        z: q.z,
      });
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      
      {showGizmo && onRotationChange ? (
        <PivotControls
          scale={2}
          activeAxes={[true, true, true]}
          onDrag={(matrix) => handleDrag(matrix)}
          depthTest={false}
          disableAxes={true}
          disableSliders={true}
          disableScaling={true}
          lineWidth={3}
        >
          <AircraftModel quaternion={quaternion} />
        </PivotControls>
      ) : (
        <AircraftModel quaternion={quaternion} />
      )}
      
      {showGrid && (
        <Grid
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#374151"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
        />
      )}
      
      {/* グローバル座標軸 */}
      <axesHelper args={[2]} />
      
      <OrbitControls makeDefault />
    </>
  );
}

export function Viewport({ quaternion, onRotationChange, showGizmo = true, showGrid = true }: ViewportProps) {
  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-b rounded-xl overflow-hidden" style={{ background: 'linear-gradient(to bottom, #111827, #1f2937)' }}>
      <Canvas
        camera={{ position: [4, 3, 4], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Scene
          quaternion={quaternion}
          onRotationChange={onRotationChange}
          showGizmo={showGizmo}
          showGrid={showGrid}
        />
      </Canvas>
      
      {/* 操作説明 */}
      <div className="absolute top-4 left-4 text-white text-xs space-y-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>操作方法</div>
        <div>🔴🟢🔵 リング: ドラッグで回転</div>
        <div>🖱️ 左ドラッグ: 視点回転</div>
        <div>🖱️ 右ドラッグ: 視点パン</div>
        <div>🖱️ ホイール: ズーム</div>
      </div>
      
      {/* 軸の凡例 */}
      <div className="absolute bottom-4 left-4 text-white text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span> X
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '50%' }}></span> Y
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span> Z
          </span>
        </div>
      </div>
    </div>
  );
}