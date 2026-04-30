import { expect, test, type Page } from "@playwright/test";

async function signUpFreshUser(page: Page, suffix: string) {
  const email = `e2e-${Date.now()}-${suffix}@example.com`;
  const password = "pass1234";

  await page.goto("/login");
  await page.getByRole("tab", { name: "회원가입" }).click();
  await page.getByLabel("이메일").last().fill(email);
  await page.getByLabel("비밀번호").last().fill(password);
  await page.getByLabel("조직명").fill(`E2E Org ${suffix}`);
  await page.getByRole("button", { name: "회원가입" }).click();

  await expect(page).toHaveURL(/\/($|\?)/);
  await expect(page.getByText("오늘 검토할 공고 찾기")).toBeVisible();

  return { email, password };
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: /^[A-Z?]$/ }).click();
  await page.getByRole("menuitem", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function signIn(page: Page, email: string, password: string, redirect = "/") {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel("이메일").first().fill(email);
  await page.getByLabel("비밀번호").first().fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
}

async function createAlertRule(page: Page, ruleName: string, keyword: string) {
  await page.getByRole("button", { name: "규칙 추가" }).click();
  const ruleDialog = page.getByRole("dialog", { name: "새 알림 규칙" });
  await expect(ruleDialog).toBeVisible();
  await ruleDialog.getByPlaceholder("예: 플랫폼 운영 공고 알림").fill(ruleName);
  await ruleDialog.getByPlaceholder("예: 플랫폼 AI 데이터 (띄어쓰기로 구분, OR 조건)").fill(keyword);
  await ruleDialog.getByRole("button", { name: "규칙 생성" }).click();
}

test.describe("authenticated workflow", () => {
  test("sign up, review a tender, save it, and create an alert rule", async ({ page }, testInfo) => {
    const uniqueSuffix = `${testInfo.parallelIndex}-${testInfo.retry}`;
    const ruleName = `플랫폼 추적 ${Date.now()}`;

    await signUpFreshUser(page, uniqueSuffix);

    const firstTenderRow = page.locator("tbody tr").first();
    await expect(firstTenderRow).toBeVisible();
    await firstTenderRow.click();

    await expect(page).toHaveURL(/\/tenders\//);
    await expect(page.getByText("참여 판단 요약")).toBeVisible();

    const favoriteRequest = page.waitForResponse(
      (response) => response.url().includes("/api/favorites/") && response.request().method() === "POST" && response.ok()
    );
    await page.getByRole("button", { name: "즐겨찾기 추가" }).click();
    await favoriteRequest;

    await page.getByRole("link", { name: "다시 볼 공고" }).click();
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.getByRole("heading", { name: "다시 볼 공고" })).toBeVisible();
    await expect(page.getByText("아직 다시 볼 공고가 없습니다")).not.toBeVisible();

    await page.getByRole("link", { name: "알림 추적" }).click();
    await expect(page).toHaveURL(/\/alerts$/);
    await expect(page.getByRole("heading", { name: "알림 추적" })).toBeVisible();

    await createAlertRule(page, ruleName, "플랫폼");

    await expect(page.getByText(ruleName)).toBeVisible();
    await expect(page.getByText(/키워드:/)).toBeVisible();
  });

  test("existing user can sign back in and open analytics", async ({ page }, testInfo) => {
    const uniqueSuffix = `login-${testInfo.parallelIndex}-${testInfo.retry}`;
    const credentials = await signUpFreshUser(page, uniqueSuffix);

    await signOut(page);
    await signIn(page, credentials.email, credentials.password, "/analytics");

    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByText("의사결정 요약")).toBeVisible();
    await expect(page.getByText("빠른 읽기")).toBeVisible();
  });

  test("authenticated user sees guided empty state for no search results", async ({ page }, testInfo) => {
    const uniqueSuffix = `empty-${testInfo.parallelIndex}-${testInfo.retry}`;
    await signUpFreshUser(page, uniqueSuffix);

    const searchInput = page.getByPlaceholder("예: 플랫폼, AI, 용역, 기관명으로 검색");
    await searchInput.fill("zzzz-no-results-keyword");

    await expect(page.getByText("검색 결과가 없습니다")).toBeVisible();
    await expect(page.getByText("조건이 너무 좁을 수 있습니다. 다른 키워드로 찾거나 상태 필터를 넓혀보세요.")).toBeVisible();
    await expect(page.getByRole("button", { name: "필터 초기화" })).toBeVisible();
  });

  test("authenticated user sees not found guidance for missing tender", async ({ page }, testInfo) => {
    const uniqueSuffix = `missing-${testInfo.parallelIndex}-${testInfo.retry}`;
    await signUpFreshUser(page, uniqueSuffix);

    await page.goto("/tenders/00000000-0000-0000-0000-000000000000");

    await expect(page.getByText("공고를 찾을 수 없습니다")).toBeVisible();
    await expect(page.getByText("삭제되었거나 잘못된 주소입니다")).toBeVisible();
    await expect(page.getByRole("button", { name: /목록으로/ })).toBeVisible();
  });

  test("authenticated user sees upgrade modal after exceeding alert rule limit", async ({ page }, testInfo) => {
    const uniqueSuffix = `limit-${testInfo.parallelIndex}-${testInfo.retry}`;
    await signUpFreshUser(page, uniqueSuffix);

    await page.getByRole("link", { name: "알림 추적" }).click();
    await expect(page).toHaveURL(/\/alerts$/);

    await createAlertRule(page, `규칙 1 ${Date.now()}`, "플랫폼1");
    await expect(page.getByText(/규칙 1/)).toBeVisible();

    await createAlertRule(page, `규칙 2 ${Date.now()}`, "플랫폼2");
    await expect(page.getByText(/규칙 2/)).toBeVisible();

    await createAlertRule(page, `규칙 3 ${Date.now()}`, "플랫폼3");
    await expect(page.getByText(/규칙 3/)).toBeVisible();

    await createAlertRule(page, `규칙 4 ${Date.now()}`, "플랫폼4");
    await expect(page.getByText("플랜 한도에 도달했습니다")).toBeVisible();
    await expect(page.getByText("Pro로 업그레이드하기")).toBeVisible();
    await expect(page.getByText("Pro 플랜으로 업그레이드하면 한도 제한 없이 사용할 수 있습니다.")).toBeVisible();
  });

  test("authenticated user sees expired invite guidance", async ({ page }, testInfo) => {
    const uniqueSuffix = `invite-expired-${testInfo.parallelIndex}-${testInfo.retry}`;
    await signUpFreshUser(page, uniqueSuffix);

    await page.route("**/api/team/accept", async (route) => {
      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({ message: "만료된 초대 링크입니다." }),
      });
    });

    await page.goto("/invite/accept?token=expired-token");

    await expect(page.getByText("만료된 초대 링크입니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "홈으로 돌아가기" })).toBeVisible();
  });

  test("authenticated user sees wrong-email invite guidance", async ({ page }, testInfo) => {
    const uniqueSuffix = `invite-wrong-email-${testInfo.parallelIndex}-${testInfo.retry}`;
    await signUpFreshUser(page, uniqueSuffix);

    await page.route("**/api/team/accept", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ message: "이 초대는 다른 이메일 주소로 발송되었습니다." }),
      });
    });

    await page.goto("/invite/accept?token=wrong-email-token");

    await expect(page.getByText("이 초대는 다른 이메일 주소로 발송되었습니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "홈으로 돌아가기" })).toBeVisible();
  });
});