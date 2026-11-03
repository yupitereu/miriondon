# Server 규칙

`apps/server/**` 작업에는 [`.ai/dev-rule.md`](../dev-rule.md)와 이 문서를 함께 적용합니다.

## 범위와 구조

- 기능 코드는 `src/features/<feature>/` 아래에 controller, service, module 단위로 둡니다. 기능이 공용 인프라에 의존하면 `src/infra/`의 module을 통해 주입받습니다.
- Controller는 HTTP 요청·응답과 경계 검증에 집중하고, 비즈니스 규칙과 데이터 접근은 service에 둡니다.
- 새 module은 `AppModule`에 등록하고, 재사용해야 하는 infrastructure service는 해당 module에서 명시적으로 export합니다.
- PostgreSQL은 `DatabaseService`, Upstash Redis는 `RedisService`를 통해 접근합니다. 직접 client를 새로 만들거나 자격 증명을 중복 해석하지 않습니다.
- 스키마·마이그레이션 방식은 아직 확정되지 않았습니다. 테이블 구조를 변경해야 하면 적용·롤백·배포 방법을 먼저 합의하고, 임의의 런타임 DDL을 제품 코드에 추가하지 않습니다.

## HTTP, 보안, 배포 경계

- Controller의 route parameter, query, body는 신뢰하지 않습니다. 형식과 권한을 검증한 뒤 service에 전달합니다.
- 응답에는 필요한 필드만 포함하고 데이터베이스 row나 내부 security state를 무심코 그대로 노출하지 않습니다.
- `main.ts`의 로컬 서버와 `api/index.ts`의 Vercel handler는 같은 `AppModule`과 CORS 정책을 사용합니다. CORS·보안 미들웨어·전역 pipe를 바꾸면 두 진입점의 동작을 함께 맞춥니다.
- `CORS_ALLOW_ORIGINS`는 쉼표 구분 allowlist입니다. 와일드카드로 완화하거나 credentials와 함께 임의 origin을 허용하지 않습니다.
- 데이터베이스 URL, Redis URL/token, 허용 origin은 환경 변수로만 주입합니다. 값 자체나 연결 문자열을 로그에 기록하지 않습니다.

## 테스트

- controller 테스트는 service를 mock하여 route-to-service 계약을 검증합니다. service의 계산·권한·상태 전이 규칙은 해당 service 단위 테스트로 검증합니다.
- HTTP·PostgreSQL 연동 변경은 e2e 테스트를 추가 또는 갱신합니다. 현재 e2e setup은 `user` 테이블을 만들고 비우므로 전용 테스트 DB에서만 실행합니다.

```bash
pnpm --filter miriondon-server test
pnpm --filter miriondon-server build
pnpm --filter miriondon-server test:e2e # 전용 테스트 DB 설정 시에만 실행
```
