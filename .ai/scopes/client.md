# Client 규칙

`apps/client/**` 작업에는 [`.ai/dev-rule.md`](../dev-rule.md)와 이 문서를 함께 적용합니다.

## 아키텍처 (FSD · 루트 직하)

`apps/client`는 **Feature-Sliced Design (FSD)** 계층을 루트 직하에 두고 Next.js 16 App Router(`app/`)와 병행합니다.

- **계층과 단방향 의존성 (상위 → 하위만 허용)**:
  1. `app/`: Next.js App Router 라우트 엔트리, 레이아웃, 메타데이터, 전역 Provider. 화면 조합 대신 `views` 슬라이스를 호출하는 얇은 경계로 유지합니다.
  2. `views/`: FSD `pages` 계층(Next.js Pages Router와 구분). 라우트별 화면 조합. (`widgets` · `features` · `entities` · `shared` 참조)
  3. `widgets/`: 독립된 복합 UI 블록(앱 셸, 대시보드 요약 카드, 필터 포함 목록 등). (`features` · `entities` · `shared` 참조)
  4. `features/`: 사용자 비즈니스 액션·유스케이스(지출 등록, 일괄 지불, 조기 완납, 일괄 회수, AI 가져오기, 테마 토글 등). (`entities` · `shared` 참조)
  5. `entities/`: 핵심 도메인 모델·조회·읽기 중심 UI(가계부, 거래, 계좌, 카드, 할부, 회수 등). (`shared`만 참조)
  6. `shared/`: 도메인 중립 앱 인프라(`shared/api`, `shared/lib`, `shared/config`, 앱 전용 `shared/ui`). 상위 계층 참조 금지.
- `[필수]` 도메인 중립 기본 UI는 `@repo/ui-core`, 화면 간 공용 조합 UI는 `@repo/ui-composition`을 우선 사용하며 `shared/ui`에 중복 복사하지 않습니다.
- `[필수]` 슬라이스·세그먼트 외부에서는 `@/<layer>/<slice>`(또는 `@/shared/<segment>`) Public API(`index.ts`)를 통해서만 import하고, 내부 파일(`@/<layer>/<slice>/**`) 직접 참조를 금지합니다. 같은 슬라이스 내부에서만 상대 경로를 사용합니다.
- `[필수]` 계층 단방향 의존성과 Public API 규칙은 [`apps/client/eslint.config.mjs`](../../apps/client/eslint.config.mjs)의 `no-restricted-imports` 규칙으로 강제합니다.
- `[권장]` 데이터 조회·상태·라우팅과 화면 표현의 책임이 과도하게 섞이면 분리하되, 페이지 전용 조합을 이르게 공용화하지 않습니다.

## Server/Client 경계

- Server Component로 가능한지 먼저 판단합니다. 이벤트 핸들러, React state/effect, 브라우저 API가 필요할 때만 `'use client'`를 추가합니다.
- Client Component의 props는 직렬화 가능한 값만 넘깁니다. 서버 전용 환경 변수나 민감 데이터를 Client Component로 전달하지 않습니다.
- 브라우저 저장소와 cookie 사용 시 데이터 수명·보안 목적·Server Component와의 일관성을 확인합니다. 인증 정보나 금융 데이터를 필요 이상으로 브라우저 저장소에 두지 않습니다.

## API와 UI

- API 호출은 [`@/shared/api`](../../apps/client/shared/api/index.ts)의 `apiClient` Axios 인스턴스를 우선 사용합니다. 서버 URL은 `NEXT_PUBLIC_API_SERVER_URL`로만 설정하며, 비밀값을 `NEXT_PUBLIC_` 환경 변수에 넣지 않습니다.
- 새 API 호출에는 로딩, 오류, 빈 상태와 성공 상태를 함께 설계합니다. 금융 요약 화면은 선택한 계좌와 기간을 항상 드러냅니다.
- 공용 버튼·아이콘·스타일 토큰은 shadcn/ui 기반 `@repo/ui-core`의 public export와 `@repo/ui-core/globals.css`를 우선 사용합니다. 화면에 필요한 primitive가 없다면 앱에 복사하지 말고 `@repo/ui-core` 추가가 적절한지 먼저 판단합니다.
- `next/image`의 새 원격 이미지는 `next.config.mjs`의 허용 설정과 이미지 제공자 신뢰성을 함께 검토합니다.
- 다크 모드와 색상 토큰을 변경하면 `html.dark`, `color-scheme`, `@repo/ui-core`의 전역 테마에 미치는 영향을 확인합니다.

## 검증

```bash
pnpm --filter miriondon-client lint
pnpm --filter miriondon-client build # 라우팅, next.config, 의존성 변경 시
```

컴포넌트 생성·추출·리팩터링에는 [React 컴포넌트 스킬](../skills/react-component/SKILL.md)을 추가로 적용합니다.
