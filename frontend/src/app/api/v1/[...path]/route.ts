import { NextRequest, NextResponse } from "next/server";

// Use 127.0.0.1 instead of localhost for better compatibility
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

/**
 * API Proxy Route Handler
 * Proxies all /api/v1/* requests to the FastAPI backend
 */
// Next.js 15+ params can be a Promise, handle both
type RouteParams = { params: Promise<{ path: string[] }> | { path: string[] } };

export async function GET(
  request: NextRequest,
  routeParams: RouteParams
) {
  return proxyRequest(request, routeParams);
}

export async function POST(
  request: NextRequest,
  routeParams: RouteParams
) {
  return proxyRequest(request, routeParams);
}

export async function PUT(
  request: NextRequest,
  routeParams: RouteParams
) {
  return proxyRequest(request, routeParams);
}

export async function PATCH(
  request: NextRequest,
  routeParams: RouteParams
) {
  return proxyRequest(request, routeParams);
}

export async function DELETE(
  request: NextRequest,
  routeParams: RouteParams
) {
  return proxyRequest(request, routeParams);
}

async function proxyRequest(
  request: NextRequest,
  routeParams: RouteParams
) {
  try {
    // Handle both sync and async params (Next.js 15+ uses Promise)
    const resolvedParams = routeParams.params instanceof Promise ? await routeParams.params : routeParams.params;
    const pathString = Array.isArray(resolvedParams.path) 
      ? resolvedParams.path.join("/") 
      : resolvedParams.path;
    
    // Preserve trailing slash from original request
    const originalPath = request.nextUrl.pathname;
    const hasTrailingSlash = originalPath.endsWith("/");
    
    // Build URL - always add trailing slash for POST/PUT/PATCH to vendor/products
    let backendPath = pathString;
    // For POST/PUT/PATCH requests, ensure trailing slash to match FastAPI routes
    if (request.method !== "GET" && request.method !== "HEAD") {
      if (!backendPath.endsWith("/")) {
        backendPath = `${backendPath}/`;
      }
    } else if (hasTrailingSlash && !backendPath.endsWith("/")) {
      backendPath = `${backendPath}/`;
    }
    
    const url = new URL(`${BACKEND_URL}/api/v1/${backendPath}`);
    
    // Copy query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Get request body if it exists
    // CRITICAL: For multipart/form-data (file uploads), we MUST preserve binary data
    // Using .text() corrupts binary files (PNG byte 0x89 becomes \xef\xbf\xbd)
    let body: BodyInit | undefined;
    const contentType = request.headers.get("content-type");
    const isMultipartFormData = contentType?.includes("multipart/form-data");
    
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        if (isMultipartFormData) {
          // For file uploads, use arrayBuffer to preserve binary data
          const arrayBuffer = await request.arrayBuffer();
          body = arrayBuffer;
        } else {
          // For JSON/text, use text() as before
          body = await request.text();
        }
      } catch (e) {
        // No body
      }
    }

    // Forward headers (excluding host and connection)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (
        !["host", "connection", "content-length"].includes(key.toLowerCase())
      ) {
        headers.set(key, value);
      }
    });

    // Make request to backend
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: body || undefined,
    });

    // Get response body
    const responseBody = await response.text();
    
    // Create response with same status and headers
    const nextResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      if (
        !["content-encoding", "content-length", "transfer-encoding"].includes(
          key.toLowerCase()
        )
      ) {
        nextResponse.headers.set(key, value);
      }
    });

    return nextResponse;
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        detail: `Proxy error: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

