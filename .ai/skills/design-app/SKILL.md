---
name: design-app
description: Create, update, and verify Miriondon screen previews, responsive layouts, themes, and interactive design-system catalogs in apps/design.
---

# 디자인 앱 작업 (`apps/design`)

`apps/design`(포트 `4100`)에서 화면 시안, 반응형 레이아웃, Light/Dark 테마, 디자인 시스템 카탈로그를 제작·수정·검증할 때 사용합니다. 디자인 토큰 및 컴포넌트 단일 기준(SSOT)은 [`docs/design-system.md`](../../../docs/design-system.md)와 [`packages/ui-core/lib/globals.css`](../../../packages/ui-core/lib/globals.css)를 따릅니다.

이 스킬의 원본은 저장소 루트의 `.ai/skills/design-app/SKILL.md`입니다. Codex 검색 경로인 `.agents/skills/design-app`은 원본 디렉터리에 대한 심볼릭 링크로 유지합니다. 상대 참조는 원본 디렉터리 기준으로 해석합니다.

## 작업 절차

1. **SSOT 및 공용 UI 확인**:
   - [`docs/design-system.md`](../../../docs/design-system.md)의 최신 토큰(Light Wine Violet / Dark Violet-Plum, Surface 계층, Semantic Tint)과 컴포넌트 규격을 확인합니다.
   - 기본 UI는 `@repo/ui-core`, 복합 UI는 `@repo/ui-composition`의 공개 export를 우선 사용합니다.
   - `apps/design` 내부에서 여러 시안이 공유하는 레이아웃 셸·필터·폼·포맷터(`DesignAppShell`, `FilterMultiSelect`/`FilterSingleSelect` 등)를 우선 재사용하고, 시안 범위 밖의 월별·서버급 분기 과구현은 피합니다.
2. **시안 페이지 등록**:
   - 시안 UI·다이얼로그·목 모델은 `apps/design/previews/<name>/`에 co-location하고, 여러 시안이 공유하는 모듈만 `apps/design/shared/`에 배치합니다.
   - `apps/design/app/preview/<name>/page.tsx`를 생성하고 [`PreviewEntry`](../../../apps/design/workbench/PreviewEntry.tsx)로 감싸 `iframe` 임베딩(`?embed=1`), 단독 탭(`?standalone=1`), 직접 접속(워크벤치 래핑)을 모두 지원합니다.
   - `apps/design/workbench/preview-routes.ts`의 `PREVIEW_ROUTES`에 시안 메타데이터를 추가합니다.
3. **공통 제작 기준 검증**:
   - 화면 배치·반응형·토큰 변경 시 실제 렌더링된 `4단 비교`(`320·375·768·1280px`)와 `단독 보기`에서 가로 오버플로우·텍스트 잘림, 터치 영역, 필터 줄바꿈, 표 정렬과 `cursor-pointer` 적용을 확인합니다.
   - Light/Dark 테마의 대비·표면 계층과 변경된 주요 상호작용을 확인하고, 확인하지 못한 화면 크기·테마·상태는 완료 보고에 명시합니다.
   - 모든 금액·수치에 `tabular-nums`와 원화 정수 표기(음수는 유니코드 `−`)를, 거래일은 `MM.DD`와 할부 회차 분리 배지를 적용하고, 모바일 주요 터치 요소 최소 `44px` 높이 및 라벨 없는 `Checkbox` 열 최소 `48px` 폭을 유지합니다.
   - 호버 전용 툴팁 대신 `?` `Popover`를 사용하고, 모바일 하단 탭 2자·태블릿 레일 2자·PC 사이드바/전체 메뉴 시트 전체 명칭, 다이얼로그 버튼 2~4자 단일 단어 및 표준 도메인 용어·띄어쓰기(`docs/design-system.md` §5)를 준수합니다.
4. **마무리 검증**:
   - 변경한 파일의 `prettier --check`, `pnpm --filter miriondon-design lint`, `pnpm --filter miriondon-design check-types`를 실행합니다.
   - 라우팅, `next.config`, 의존성을 변경한 경우 `pnpm --filter miriondon-design build`도 실행합니다.
