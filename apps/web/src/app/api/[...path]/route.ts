import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:3001';

async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const pathStr = path.join('/');
    
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/api/${pathStr}${searchParams ? `?${searchParams}` : ''}`;

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
        headers.set(key, value);
      }
    });

    const options: RequestInit = {
      method: request.method,
      headers,
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
      const contentType = request.headers.get('content-type') || '';
      const contentLength = request.headers.get('content-length');
      
      if (contentLength !== '0') {
        try {
          if (contentType.includes('application/json')) {
            const bodyText = await request.text();
            if (bodyText && bodyText.trim().length > 0) {
              options.body = bodyText;
            }
          } else if (contentType.includes('multipart/form-data')) {
            options.body = await request.formData();
          } else {
            const blob = await request.blob();
            if (blob && blob.size > 0) {
              options.body = blob;
            }
          }
        } catch (bodyError) {
          console.warn('[BFF Proxy] Warning reading request body:', bodyError);
        }
      }
      // @ts-ignore
      options.duplex = 'half';
    }

    console.log(`[BFF Proxy] Request ${request.method} ${pathStr}`);
    console.log(`[BFF Proxy] Request Cookie Header:`, request.headers.get('cookie'));

    const res = await fetch(targetUrl, options);

    console.log(`[BFF Proxy] Response Status: ${res.status}`);
    console.log(`[BFF Proxy] Response Set-Cookie Header:`, res.headers.getSetCookie());

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (
        key.toLowerCase() !== 'transfer-encoding' &&
        key.toLowerCase() !== 'content-encoding' &&
        key.toLowerCase() !== 'content-length' &&
        key.toLowerCase() !== 'set-cookie'
      ) {
        responseHeaders.set(key, value);
      }
    });

    const setCookies = res.headers.getSetCookie();
    for (const cookie of setCookies) {
      responseHeaders.append('Set-Cookie', cookie);
    }

    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('BFF Proxy Error:', error);
    return NextResponse.json({ error: error.message || 'BFF Proxy Error' }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: any) { return handleRequest(req, ctx); }
export async function POST(req: NextRequest, ctx: any) { return handleRequest(req, ctx); }
export async function PUT(req: NextRequest, ctx: any) { return handleRequest(req, ctx); }
export async function PATCH(req: NextRequest, ctx: any) { return handleRequest(req, ctx); }
export async function DELETE(req: NextRequest, ctx: any) { return handleRequest(req, ctx); }
