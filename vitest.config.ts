import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Node 환경 (DOM 불필요한 순수 함수 테스트)
    environment: "node",
    // describe/it/expect 등을 import 없이 사용 가능
    globals: true,
    // Playwright E2E 스펙은 Vitest 대상에서 제외
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    // 커버리지 설정
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/supabase/**", "src/lib/notifications/**"],
    },
  },
  resolve: {
    // tsconfig.json의 @/* 경로 별칭을 vitest에서도 인식
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
