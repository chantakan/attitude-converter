'use client';

import dynamic from 'next/dynamic';
import { useRotationState } from '@/hooks/useRotationState';
import { QuaternionPanel } from '@/components/QuaternionPanel';
import { EulerPanel } from '@/components/EulerPanel';
import { MrpPanel } from '@/components/MrpPanel';

// 3Dビューポートはクライアントサイドのみ
const Viewport = dynamic(
  () => import('@/components/Viewport').then((mod) => mod.Viewport),
  { ssr: false, loading: () => <div className="w-full h-[400px] bg-gray-800 rounded-xl animate-pulse" /> }
);

export default function Home() {
  const {
    result,
    eulerOrder,
    useDegrees,
    autoShadowMrp,
    isLoading,
    error,
    setEulerOrder,
    setUseDegrees,
    setAutoShadowMrp,
    updateFromQuaternion,
    updateFromEuler,
    updateFromMrp,
    getEulerOrders,
    degToRad,
    radToDeg,
  } = useRotationState();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-error text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Failed to Load</h2>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attitude Converter</h1>
            <p className="text-sm text-gray-500">3D Rotation Representation Tool</p>
          </div>
          <div className="flex items-center gap-4">
            {isLoading && (
              <span className="text-sm text-gray-500">Loading WASM...</span>
            )}
            <a
              href="https://github.com/chantakan/attitude-converter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：3Dビューポート */}
          <div className="card p-0 overflow-hidden">
            <Viewport
              quaternion={result.quaternion}
              onRotationChange={(q) => updateFromQuaternion(q.w, q.x, q.y, q.z)}
              showGizmo={!isLoading}
              showGrid={true}
            />
          </div>

          {/* 右側：パラメータパネル */}
          <div className="space-y-4">
            {/* クォータニオン */}
            <QuaternionPanel
              quaternion={result.quaternion}
              onUpdate={updateFromQuaternion}
              disabled={isLoading}
            />

            {/* オイラー角 */}
            <EulerPanel
              euler={result.euler}
              eulerOrder={eulerOrder}
              useDegrees={useDegrees}
              eulerOrders={getEulerOrders()}
              onUpdate={updateFromEuler}
              onOrderChange={setEulerOrder}
              onUseDegreesChange={setUseDegrees}
              degToRad={degToRad}
              radToDeg={radToDeg}
              disabled={isLoading}
            />

            {/* MRP */}
            <MrpPanel
              mrp={result.mrp}
              autoShadow={autoShadowMrp}
              onUpdate={updateFromMrp}
              onAutoShadowChange={setAutoShadowMrp}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* 回転行列表示 */}
        <div className="mt-6 card">
          <h3 className="font-semibold text-gray-800 mb-3">Rotation Matrix</h3>
          <div className="font-mono text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <table className="w-full">
              <tbody>
                {result.rotation_matrix.matrix.map((row, i) => (
                  <tr key={i}>
                    {row.map((val, j) => (
                      <td key={j} className="px-4 py-1 text-right">
                        {val.toFixed(6)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 軸角表示 */}
        <div className="mt-4 card">
          <h3 className="font-semibold text-gray-800 mb-3">Axis-Angle</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Axis:</span>
              <span className="ml-2 font-mono">
                [{result.axis_angle.axis.map((v) => v.toFixed(4)).join(', ')}]
              </span>
            </div>
            <div>
              <span className="text-gray-500">Angle:</span>
              <span className="ml-2 font-mono">
                {useDegrees
                  ? `${radToDeg(result.axis_angle.angle).toFixed(2)}°`
                  : `${result.axis_angle.angle.toFixed(4)} rad`}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-12 py-6 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Powered by Rust + WebAssembly</p>
        </div>
      </footer>
    </div>
  );
}
