# Design 앱 규칙

`apps/design/**` 작업에는 [`.ai/dev-rule.md`](../dev-rule.md), [`docs/design-system.md`](../../docs/design-system.md)와 이 문서를 함께 적용합니다.

## 역할과 경계

- `apps/design`(`miriondon-design`, 포트 `4100`)은 신규 화면 시안, 반응형 브레이크포인트(`320·375·768·1280px`), Light/Dark 테마, UI 인터랙션을 사전 검증하는 디자인 전용 앱입니다.
- `[필수]` `apps/client` 및 `apps/server`의 내부 코드를 직접 import하지 않습니다. 공용 UI는 `@repo/ui-core`와 `@repo/ui-composition`의 공개 export만 사용합니다.
- `[필수]` 실제 API·DB·인증 연동 대신 로컬 목 데이터와 인터랙션 상태만 사용합니다.
- 시안에서는 레이아웃·반응형·카피·핵심 상태 전환 검증에 집중하고, 실서버 분기나 전체 월별 데이터 생성 같은 과도한 구현은 `apps/client` 단계로 미룹니다.
- 신규 시안 제작 시 공용 패턴(`DesignAppShell`, `FilterMultiSelect`/`FilterSingleSelect`, `table-fixed` 표 규격, `?` `Popover` 안내)을 우선 재사용합니다.
- 시안이 확정된 화면만 `apps/client` 본 화면으로 이관해 도메인 로직·API·Validation을 연결합니다. 여러 화면에 반복되는 도메인 중립 조합을 공용화할지는 [공용 패키지 규칙](shared-packages.md) 기준으로 판단합니다.

## 라우트 및 워크벤치 규칙

- `[필수]` 모든 시안 페이지는 `app/preview/<name>/page.tsx`에 배치하고 [`PreviewEntry`](../../apps/design/components/PreviewEntry.tsx)로 감싸 직접 접속 시에도 [`DesignWorkbench`](../../apps/design/components/DesignWorkbench.tsx)(`4단 비교` / `단독 보기` / Light·Dark 전환)로 열리도록 구성합니다.
- `[필수]` 새 시안 경로는 [`PREVIEW_ROUTES`](../../apps/design/lib/preview-routes.ts)에 등록해 워크벤치 시안 셀렉터에서 바로 전환할 수 있어야 합니다.
- `4단 비교`(`320·375·768·1280px`)와 `단독 보기`(브라우저 창 크기 100% 맞춤)에서 잘림, 가로 오버플로우, 터치 영역(`44px`, `Checkbox` 열 최소 `48px`) 미달, `768px` 필터 줄바꿈·표 열 어긋남, 인터랙티브 요소 `cursor-pointer` 누락이 없는지 확인합니다.

## 검증

```bash
pnpm exec prettier --check "apps/design/**/*.{ts,tsx,js,mjs,md}"
pnpm --filter miriondon-design lint
pnpm --filter miriondon-design check-types
pnpm --filter miriondon-design build # 라우팅, next.config, 의존성 변경 시
```

화면 시안·토큰·카탈로그 제작에는 [디자인 앱 스킬](../skills/design-app/SKILL.md)을 추가로 적용합니다.
