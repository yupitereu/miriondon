# @repo/ui-composition

`@repo/ui-core`의 기본 UI 부품을 조합하는 도메인 중립 공통 React 컴포넌트 패키지입니다.

## 공개 컴포넌트

- `Calendar`: 날짜 선택용 달력 컴포넌트
- `DatePicker`: 모바일 바텀시트·데스크톱 팝오버 전환 날짜 선택기
- `PeriodPicker`: 월(`YYYY.MM`)·연도(`YYYY`) 단위 기간 선택기
- `CommonDialogHost` / `dialog`: 전역 명령형 다이얼로그(`dialog.alert`, `dialog.confirm`, `dialog.prompt`) 호스트 및 API

## 패키지 규칙

- 기본 UI 부품, 아이콘, 스타일 토큰은 `@repo/ui-core`에 둡니다.
- 서로 다른 화면에서 같은 의미와 동작으로 재사용하는 조합은 `@repo/ui-composition`에 둡니다.
- API 호출, 인증, 라우팅, 가계부 업무 규칙과 화면 전용 조합은 `apps/client`에 둡니다.
- 실제 사용 요구가 있는 컴포넌트만 추가하고 `index.ts`에서 named export로 공개합니다.
- `@repo/ui-core`의 public export를 사용하며 `@repo/ui-core`는 이 패키지를 참조하지 않습니다.
- state, effect, 이벤트 핸들러 등이 필요한 파일에만 `'use client'`를 선언합니다.
- 테마와 전역 스타일은 소비 앱에서 `@repo/ui-core/globals.css`를 불러옵니다.

## 검증

```bash
pnpm --filter @repo/ui-composition lint
pnpm --filter @repo/ui-composition check-types
pnpm --filter miriondon-client build
```
