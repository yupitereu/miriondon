# Client 규칙

`apps/client/**` 작업에는 [`.ai/dev-rule.md`](../dev-rule.md)와 이 문서를 함께 적용합니다.

## 범위와 구조

- `app/`은 Next.js 16 App Router의 라우트·레이아웃 경계입니다. 새 화면은 App Router 규칙과 기존 폴더 구조를 따릅니다.
- 앱 내부 import는 `@/` alias를 우선 사용합니다.
- 화면·기능 전용 컴포넌트, hook, API client는 `apps/client`에 둡니다. 도메인 중립 기본 UI는 `@repo/ui-core`, 서로 다른 화면에서 재사용하는 공통 조합은 `@repo/ui-composition`에 둡니다.
- 데이터 조회·상태·라우팅과 화면 표현의 책임이 과도하게 섞이면 분리하되, 페이지 전용 조합을 이르게 공용화하지 않습니다.

## Server/Client 경계

- Server Component로 가능한지 먼저 판단합니다. 이벤트 핸들러, React state/effect, 브라우저 API가 필요할 때만 `'use client'`를 추가합니다.
- Client Component의 props는 직렬화 가능한 값만 넘깁니다. 서버 전용 환경 변수나 민감 데이터를 Client Component로 전달하지 않습니다.
- 브라우저 저장소와 cookie 사용 시 데이터 수명·보안 목적·Server Component와의 일관성을 확인합니다. 인증 정보나 금융 데이터를 필요 이상으로 브라우저 저장소에 두지 않습니다.

## API와 UI

- API 호출은 `lib/clients/apiClient.ts`의 Axios 인스턴스를 우선 사용합니다. 서버 URL은 `NEXT_PUBLIC_API_SERVER_URL`로만 설정하며, 비밀값을 `NEXT_PUBLIC_` 환경 변수에 넣지 않습니다.
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
