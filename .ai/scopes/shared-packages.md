# Shared packages 규칙

`packages/**` 작업에는 [`.ai/dev-rule.md`](../dev-rule.md)와 이 문서를 함께 적용합니다.

## `@repo/ui-core`

- `packages/ui-core`는 shadcn/ui 기반 공용 UI 레이어입니다. 여러 화면에서 재사용되고 도메인에 묶이지 않은 UI primitive, 아이콘, 스타일 토큰만 둡니다. 가계부의 특정 화면·거래 흐름·API 호출은 client 앱에 둡니다.
- shadcn/ui 컴포넌트는 실제 화면 요구사항이 생겼을 때만 추가합니다. 전체 컴포넌트를 사전 설치하거나, 앱 전용 조합을 `@repo/ui-core`에 넣지 않습니다.
- 컴포넌트를 추가할 때는 `components.json`의 alias·CSS 경로·CSS 변수 설정을 기준으로 생성하고, 생성 결과의 의존성·import 경로·public export를 검토합니다.
- public API를 추가·변경할 때는 `index.ts` export와 `package.json`의 `exports`를 함께 갱신하고, 사용 중인 앱을 확인합니다.
- 기존 `Button`처럼 variant 기반 컴포넌트는 `class-variance-authority`와 `cn` 패턴을 유지합니다. 소비자가 같은 형태의 className 조합을 반복하지 않도록 하되, 단일 사용 사례 때문에 과도한 variant를 추가하지 않습니다.
- 아이콘은 `Icon` wrapper를 통해 크기와 접근성 기본값을 일관되게 적용합니다. 의미 전달이 필요한 아이콘에는 이름 또는 인접 텍스트를 제공합니다.
- `lib/globals.css`의 Tailwind theme, 색상 토큰, 다크 모드 변경은 모든 소비 화면에 영향을 줍니다. 기존 semantic token을 우선 사용하고, 시각적 변경 범위를 확인합니다.

## `@repo/ui-composition`

- `packages/ui-composition`는 `@repo/ui-core`의 기본 부품을 조합하는 도메인 중립 공통 React 컴포넌트 레이어입니다. 서로 다른 화면에서 같은 의미와 동작으로 재사용하는 조합만 둡니다.
- 의존성은 앱 → `@repo/ui-composition` → `@repo/ui-core` 방향으로 유지합니다. `@repo/ui-core`에서 이 패키지를 참조하지 않습니다.
- API 호출, 인증, 라우팅, 가계부 업무 규칙과 화면 전용 조합은 client 앱에 둡니다.
- 실제 사용 요구가 있는 컴포넌트만 추가하고, public API는 `index.ts`와 `package.json`의 `exports`로 제공합니다.
- 테마와 스타일 토큰은 `@repo/ui-core`를 사용하고, 소비 앱에서 `@repo/ui-core/globals.css`를 불러옵니다.
- `'use client'`는 state, effect, 이벤트 핸들러 등이 필요한 파일에만 선언합니다.

## `@repo/project-config`

- 공유 ESLint, Stylelint, TypeScript 설정 변경은 모든 workspace에 영향을 줍니다. 설정을 완화하거나 새 규칙을 추가할 때 대상 workspace를 확인하고 최소한의 검증을 실행합니다.
- 앱별 설정은 공용 설정을 import해 확장합니다. 앱 한 곳의 문제를 해결하기 위해 공용 기준을 무분별하게 변경하지 않습니다.

## 검증

```bash
pnpm --filter @repo/ui-core lint
pnpm --filter @repo/ui-core check-types
pnpm --filter @repo/ui-composition lint
pnpm --filter @repo/ui-composition check-types
```

공용 설정을 변경했거나 public export가 바뀌면 관련 client/server 검증과 필요 시 루트 `pnpm build`를 추가합니다.
