# Attitude Converter

A web-based 3D rotation representation converter

[日本語](./README.md) | [**Demo**](https://attitude-converter.tompython.com/)

![Screenshot](docs/demo.png)

## Features

- **Quaternion** ⇔ **Euler Angles** ⇔ **MRP** ⇔ **Axis-Angle** ⇔ **Rotation Matrix**
- 12 Euler angle sequences (ZYX, XYZ, ZXZ, etc.)
- Gimbal lock detection
- MRP Shadow Set auto-switching
- Interactive 3D visualization

## Tech Stack

- **Frontend**: Next.js, React Three Fiber, TypeScript
- **Core**: Rust → WebAssembly

## Getting Started

```bash
git clone https://github.com/chantakan/attitude-converter.git
cd attitude-converter

# Build WASM
cd attitude-wasm
wasm-pack build --target web --release
cp pkg/attitude_wasm.js ../public/wasm/
cp pkg/attitude_wasm_bg.wasm ../public/wasm/
cd ..

# Run
npm install
npm run dev
```

Open http://localhost:3000

## License

[MIT](LISENCE)