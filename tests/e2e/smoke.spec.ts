import { expect, test } from "@playwright/test";

test.describe("public smoke flows", () => {
  test("landing page renders hero", async ({ page }) => {
    await page.goto("/landing");

    await expect(page).toHaveURL(/\/landing$/);
    await expect(page.getByRole("heading", { name: /필요한 것만/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /무료로 시작하기/i }).first()).toBeVisible();
  });

  test("login page renders auth shell", async ({ page }) => {
    await page.goto("/login?redirect=%2Fanalytics");

    await expect(page).toHaveURL(/\/login\?redirect=%2Fanalytics$/);
    await expect(page.getByRole("heading", { name: /공공 입찰 검토를/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /로그인/i }).first()).toBeVisible();
  });
});

test.describe("http smoke flows", () => {
  test("root redirects anonymous users to landing", async ({ request }) => {
    const response = await request.get("/", {
      failOnStatusCode: false,
      maxRedirects: 0,
    });

    expect([302, 307]).toContain(response.status());
    expect(response.headers()["location"]).toContain("/landing");
  });

  test("protected pages redirect anonymous users to login", async ({ request }) => {
    const analyticsResponse = await request.get("/analytics", {
      failOnStatusCode: false,
      maxRedirects: 0,
    });

    expect([302, 307]).toContain(analyticsResponse.status());
    expect(analyticsResponse.headers()["location"]).toContain("/login?redirect=%2Fanalytics");

    const favoritesResponse = await request.get("/favorites", {
      failOnStatusCode: false,
      maxRedirects: 0,
    });

    expect([302, 307]).toContain(favoritesResponse.status());
    expect(favoritesResponse.headers()["location"]).toContain("/login?redirect=%2Ffavorites");

    const operationsResponse = await request.get("/settings/operations", {
      failOnStatusCode: false,
      maxRedirects: 0,
    });

    expect([302, 307]).toContain(operationsResponse.status());
    expect(operationsResponse.headers()["location"]).toContain("/login");
  });

  test("health endpoint responds with ok payload", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();

    expect(response.ok()).toBe(true);
    expect(body).toEqual({
      status: "ok",
      timestamp: expect.any(String),
    });
  });
});