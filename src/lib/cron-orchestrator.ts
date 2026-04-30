import { getErrorMessage } from "@/lib/job-utils";

export type CronStep = {
  name: string;
  path: string;
  method: "GET" | "POST";
  days?: number[];
};

export type CronStepResult = {
  name: string;
  path: string;
  ok: boolean;
  status: number;
  body: unknown;
};

export async function runCronStep(
  request: Request & { headers: Headers; nextUrl: URL },
  step: CronStep
): Promise<CronStepResult> {
  try {
    const response = await fetch(new URL(step.path, request.nextUrl.origin), {
      method: step.method,
      headers: {
        Authorization: request.headers.get("authorization") ?? "",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });

    const body = await readJsonSafely(response);

    return {
      name: step.name,
      path: step.path,
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (error) {
    const errorName =
      error && typeof error === "object" && "name" in error
        ? String((error as { name?: unknown }).name)
        : "";

    return {
      name: step.name,
      path: step.path,
      ok: false,
      status: errorName === "TimeoutError" ? 504 : 500,
      body: { error: getErrorMessage(error) },
    };
  }
}

export async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}