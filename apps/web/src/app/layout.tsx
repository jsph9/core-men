import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: 'CoreMen — Plataforma Textil Gamarra',
  description: 'Plataforma web de gestión de ventas textiles para el modelo Gamarra, Lima, Perú',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
