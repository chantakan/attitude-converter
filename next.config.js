/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // SSG用
  trailingSlash: true,
  images: {
    unoptimized: true,  // 静的エクスポート用
  },
  webpack: (config, { isServer }) => {
    // WASMサポート
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // WASMファイルの処理
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
};

module.exports = nextConfig;
