import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Attitude Converter - 3D Rotation Tool',
  description: 'Convert between Euler angles, Quaternions, and Modified Rodrigues Parameters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
