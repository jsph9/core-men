import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Protected client routes
  if (pathname.startsWith('/carrito') || pathname.startsWith('/checkout') || pathname.startsWith('/pedidos') || pathname.startsWith('/personalizar') || pathname.startsWith('/cotizaciones')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Protected merchant routes
  if (pathname.startsWith('/gestion-cotizaciones') || pathname.startsWith('/gestion-pedidos')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Protected admin routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/productos') || pathname.startsWith('/categorias') || pathname.startsWith('/descuentos') || pathname.startsWith('/usuarios') || pathname.startsWith('/reportes') || pathname.startsWith('/auditoria') || pathname.startsWith('/errores')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/carrito/:path*',
    '/checkout/:path*',
    '/pedidos/:path*',
    '/personalizar/:path*',
    '/cotizaciones/:path*',
    '/gestion-cotizaciones/:path*',
    '/gestion-pedidos/:path*',
    '/dashboard/:path*',
    '/productos/:path*',
    '/categorias/:path*',
    '/descuentos/:path*',
    '/usuarios/:path*',
    '/reportes/:path*',
    '/auditoria/:path*',
    '/errores/:path*',
  ],
};
