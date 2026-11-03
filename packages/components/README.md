# @repo/components

`@repo/ui`의 기본 UI 부품을 조합하는 도메인 중립 공통 React 컴포넌트 패키지입니다. 현재 공개 컴포넌트는 없습니다.

- 기본 UI 부품, 아이콘, 스타일 토큰은 `@repo/ui`에 둡니다.
- 서로 다른 화면에서 같은 의미와 동작으로 재사용하는 조합은 `@repo/components`에 둡니다.
- API 호출, 인증, 라우팅, 가계부 업무 규칙과 화면 전용 조합은 `apps/client`에 둡니다.
- 실제 사용 요구가 있는 컴포넌트만 추가하고 `index.ts`에서 named export로 공개합니다.
- `@repo/ui`의 public export를 사용하며 `@repo/ui`는 이 패키지를 참조하지 않습니다.
- state, effect, 이벤트 핸들러 등이 필요한 파일에만 `'use client'`를 선언합니다.
- 테마와 전역 스타일은 소비 앱에서 `@repo/ui/globals.css`를 불러옵니다.

## 검증

```bash
pnpm --filter @repo/components lint
pnpm --filter @repo/components check-types
pnpm --filter moneiet-client build
```
