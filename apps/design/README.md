# miriondon-design

`@repo/ui-core`·`@repo/ui-composition` 컴포넌트와 화면 시안을 실제 브라우저 환경(뷰포트 `320/375/768/1280px` 4단 비교, Light/Dark, 인터랙션)에서 사전 검증하는 디자인 앱입니다.

- 개발 서버: `pnpm --filter miriondon-design dev` (`http://localhost:4100`)
- 시안 경로: `/` 및 `/preview/*` (`/preview/settlement`, `/preview/expenses`, `/preview/assets`, `/preview/expense-edit`, `/preview/design-system`) 직접 접속 시 모두 `4단 비교` 워크벤치로 열리며, `?standalone=1`로 순수 화면만 단독 확인 가능
- `apps/client`와 코드를 직접 import하지 않고 `@repo/ui-core`·`@repo/ui-composition`만 공유하며, 확정된 화면 시안은 `apps/client`로 이관합니다.
