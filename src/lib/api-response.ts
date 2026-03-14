import { NextResponse } from "next/server";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json({ code, message, details }, { status });
}

export function unauthorizedResponse(message = "인증이 필요합니다") {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function forbiddenResponse(message = "권한이 없습니다") {
  return errorResponse("FORBIDDEN", message, 403);
}

export function notFoundResponse(message = "리소스를 찾을 수 없습니다") {
  return errorResponse("NOT_FOUND", message, 404);
}

export function internalErrorResponse(message = "서버 오류가 발생했습니다") {
  return errorResponse("INTERNAL_ERROR", message, 500);
}

// Simplified API response helper
export const apiResponse = {
  success: <T>(data: T, status = 200) => successResponse(data, status),
  error: (message: string, status = 500, details?: unknown) =>
    errorResponse("ERROR", message, status, details),
  unauthorized: unauthorizedResponse,
  forbidden: forbiddenResponse,
  notFound: notFoundResponse,
};
