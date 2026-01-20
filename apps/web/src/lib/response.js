import { NextResponse } from "next/server";

export function success(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(messageOrObj, status = 400, code = null) {
  let errorObj = {};

  if (typeof messageOrObj === 'string') {
    errorObj = {
      message: messageOrObj,
      code: code || `ERROR_${status}`
    };
  } else if (typeof messageOrObj === 'object') {
    // Handle { code, message, details } object
    errorObj = {
      message: messageOrObj.message || 'An error occurred',
      code: messageOrObj.code || code || `ERROR_${status}`,
      details: messageOrObj.details
    };
  }

  return NextResponse.json(
    { 
      success: false, 
      error: errorObj
    }, 
    { status }
  );
}

// Aliases for backward compatibility
export const successResponse = success;
export const errorResponse = error;

export function created(data) {
  return success(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function unauthorized(message = "Unauthorized") {
  return error({ message, code: 'UNAUTHORIZED' }, 401);
}

export function forbidden(message = "Forbidden") {
  return error({ message, code: 'FORBIDDEN' }, 403);
}

export function notFound(message = "Not found") {
  return error({ message, code: 'NOT_FOUND' }, 404);
}

export function serverError(message = "Internal server error") {
  return error({ message, code: 'INTERNAL_SERVER_ERROR' }, 500);
}
