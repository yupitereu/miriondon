# AI 코딩 에이전트 공통 규칙

이 문서는 `miriondon` 모노레포 전체의 공통 개발 규칙입니다. 작업 시작 전에 읽고, 변경하는 코드와 직접 관련된 규칙을 작업이 끝날 때까지 적용합니다.

## 1. 규칙 적용 원칙

- 이 문서는 저장소 전체에 적용되는 기본 코드·검증 규칙입니다. 응답 원칙과 도메인 원칙은 [`AGENTS.md`](../AGENTS.md) 및 [`.ai/domain-rule.md`](domain-rule.md)를 따르며, 작업별 스킬과 경로별 규칙 문서가 있으면 함께 적용합니다.
- 자동 검사가 통과하더라도 이 문서의 필수 규칙을 생략하지 않습니다.

## 2. 저장소 환경과 경계

| 항목                       | 기준                                                        |
| -------------------------- | ----------------------------------------------------------- |
| 런타임                     | `.nvmrc`에 고정한 Node.js LTS                               |
| 패키지 매니저              | `pnpm@12.11.2`                                              |
| 모노레포                   | pnpm workspace + Turborepo                                  |
| 포맷터                     | Prettier 3 (`.prettierrc.json`)                             |
| JavaScript/TypeScript 검사 | ESLint (`packages/project-config/lint/eslint.config.mjs`)   |
| CSS 검사                   | Stylelint (`packages/project-config/lint/.stylelintrc.mjs`) |

의존성 설치와 스크립트 실행은 저장소 루트 또는 대상 workspace에서 `pnpm`으로 수행합니다.

```text
miriondon/
├── apps/
│   ├── client/            # Next.js 16 App Router 웹 클라이언트 (포트 4000)
│   ├── design/            # 디자인 시스템 카탈로그 및 화면 시안 워크벤치 (포트 4100)
│   └── server/            # NestJS API와 Vercel serverless entrypoint
└── packages/
    ├── project-config/    # ESLint, Stylelint, TypeScript 공통 설정
    ├── ui-composition/    # 기본 UI를 조합한 도메인 중립 공통 컴포넌트 (@repo/ui-composition)
    └── ui-core/           # 공용 React UI, Tailwind 테마, 아이콘 (@repo/ui-core)
```

- `[필수]` 앱에서 다른 앱의 내부 코드를 import하지 않습니다. 여러 영역에 필요한 코드는 공용 패키지의 공개 API로 제공합니다.
- `[필수]` 다른 패키지의 `src`, `lib`, `dist` 등 내부 경로를 직접 import하지 않습니다. `package.json`의 public export만 사용합니다.
- `[필수]` workspace 내부 의존성은 `workspace:*`로 연결합니다.
- `[필수]` 공용 패키지의 공개 API를 변경하면 `package.json`의 `exports`, 영향을 받는 앱, 하위 호환성을 함께 확인합니다.

## 3. 코드 스타일

### 4.1 포맷팅과 이름

`.prettierrc.json`을 단일 기준으로 사용합니다.

- `[필수]` 스페이스 2칸, 작은따옴표, 세미콜론, trailing comma 없음, `printWidth: 200`을 사용합니다.
- `[필수]` 탭을 사용하지 않습니다.
- `[검증]` TypeScript, JavaScript, Markdown을 수정하면 변경 파일에만 Prettier 검사를 실행합니다.
- `[필수]` 컴포넌트와 클래스 파일은 `PascalCase`, 훅·유틸리티·일반 모듈과 디렉터리는 `kebab-case`를 사용합니다.
- `[예외]` Next.js 예약 파일, 동적 세그먼트, 라우트 그룹, 기존 생성 파일명은 프레임워크와 기존 구조를 따릅니다.

```bash
pnpm exec prettier --check <변경한-파일들>
pnpm exec prettier --write <변경한-파일들>
```

### 4.2 TypeScript와 모듈

- `[필수]` 새 코드에서 `any`, `as any`, 불필요한 non-null assertion, 타입 오류를 숨기는 단언을 사용하지 않습니다. 외부 입력은 `unknown`으로 받고 narrowing합니다.
- `[필수]` 라이브러리·프레임워크·런타임·DOM API에서 `@deprecated`로 지정된 항목(예: React 19의 `React.FormEvent`·`FormEventHandler`)은 사용하지 않고 공식 대체안(`React.SubmitEvent`·`SubmitEventHandler`·`ChangeEvent`·`InputEvent`·`SyntheticEvent` 등)으로 작성합니다.
- `[필수]` 타입 선언은 `type`을 기본으로 사용합니다. declaration merging, 전역 타입 확장, 외부 라이브러리 요구처럼 필요한 경우에만 `interface`를 사용합니다.
- `[필수]` 재사용하지 않는 props 타입은 선언부에 인라인으로 작성하고, 재사용되는 타입과 도메인 타입은 의미가 드러나는 파일에 둡니다.
- `[필수]` 새 코드에 사용하지 않는 import와 변수를 남기지 않습니다. `_` 접두사는 의도적으로 사용하지 않는 매개변수에만 사용합니다.
- `[필수]` import 순서는 공유 ESLint 설정의 `import/order`를 단일 기준으로 따릅니다. import를 수정하면 대상 workspace의 lint를 실행합니다.
- `[필수]` `export default`는 Next.js 페이지·레이아웃·프레임워크 진입점처럼 필요한 경우에만 사용하고, 그 밖에는 named export를 기본으로 합니다.

### 4.3 함수, React, 브라우저 API

- `[필수]` React 컴포넌트·일반 함수·이벤트 핸들러는 arrow function으로 작성하는 것을 기본으로 합니다(NestJS 메서드 및 프레임워크가 요구하는 형태는 예외).
- `[필수]` React 컴포넌트에는 `React.FC`·`React.forwardRef`·`React.ElementRef`·`Context.Provider`/`Consumer`·`defaultProps`/`propTypes`를 사용하지 않습니다. `ref`는 `React.ComponentProps` 기반 일반 prop으로 전달하고(`React.ComponentRef`는 꼭 필요한 경우에만 사용), Context는 `<Context value={...}>`로 직접 렌더링합니다.
- `[권장]` React 컴포넌트 내부 선언 순서는 변수·state, custom hook·`useMemo`, `useCallback`·이벤트 핸들러, `useEffect` 순으로 둡니다.
- `[필수]` 한 번만 쓰이는 코드를 의미 없이 공용 유틸리티나 컴포넌트로 추출하지 않습니다.
- `[필수]` 운영 코드에 `console.log`, `console.debug`를 남기지 않습니다. 진단용 `console.info`, `console.warn`, `console.error`는 의미 있는 메시지와 필요한 범위에서만 사용합니다.
- `[필수]` `window`, `document`, `localStorage`, `sessionStorage`는 브라우저 실행이 보장되는 Client Component 또는 hook에서만 사용합니다.
- `[필수]` App Router의 `'use client'`는 state, effect, event handler, 브라우저 API가 필요한 파일에만 추가하고 경계를 작게 유지합니다.

### 4.4 CSS와 UI

- `[필수]` CSS는 Stylelint를 통과해야 합니다.
- `[필수]` 새 class, id, keyframe 이름은 소문자로 시작하고 영문 소문자·숫자·`-`·`_`만 사용합니다. 새 selector는 `kebab-case`를 기본으로 합니다.
- `[검증]` CSS 속성은 알파벳순을 유지합니다.
- `[필수]` Tailwind를 사용하는 파일은 해당 영역의 기존 className 그룹화와 정렬 방식을 유지합니다. 단순 포맷 목적으로 전체 className을 재정렬하지 않습니다.
- `[필수]` 공용 UI가 맞는 경우 shadcn/ui 기반의 `@repo/ui-core`를 우선 사용하고, 한 화면 전용 조합은 앱 가까이에 둡니다.
- `[필수]` shadcn/ui 컴포넌트는 실제 사용 사례가 생겼을 때만 `packages/ui-core`에 추가합니다. 사용 가능성이 있다는 이유로 컴포넌트 묶음을 미리 추가하지 않습니다.

## 4. API와 데이터 접근

- `[필수]` API 요청·응답 형태는 계약으로 취급합니다. 변경 시 클라이언트 호출부와 테스트를 같은 변경에 포함합니다.
- `[필수]` 외부 입력을 API 경계에서 검증하고, 민감 정보를 노출하지 않는 오류를 반환합니다.
- `[필수]` 레코드 단위 API는 서버에서 권한을 검사합니다. 클라이언트의 화면 제어만으로 접근을 제한하지 않습니다.
- `[필수]` SQL 값은 parameterized query로 전달하고 문자열 보간으로 만들지 않습니다.
- `[필수]` 데이터베이스·Redis·외부 서비스의 설정값은 환경 변수에서 읽고, 구성되지 않았을 때의 오류 경로를 명확히 처리합니다.

## 5. 검증 기준

작업 범위에 따라 필요한 검증을 선택합니다.

| 변경 범위                                  | 기본 검증                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 문서·설정만 변경                           | `pnpm exec prettier --check <변경한-파일들>`, `git diff --check`                            |
| `apps/client` 코드 변경                    | `pnpm --filter miriondon-client lint`                                                       |
| `apps/client` 라우팅·빌드 설정·의존성 변경 | `pnpm --filter miriondon-client build`                                                      |
| `apps/design` 코드 변경                    | `pnpm --filter miriondon-design lint`, `pnpm --filter miriondon-design check-types`         |
| `apps/design` 라우팅·빌드 설정·의존성 변경 | `pnpm --filter miriondon-design build`                                                      |
| `apps/server` 코드 변경                    | `pnpm --filter miriondon-server test`, `pnpm --filter miriondon-server build`               |
| 서버 HTTP 통합·DB 연동 변경                | 전용 테스트 DB에서 `pnpm --filter miriondon-server test:e2e`                                |
| `packages/ui-core` 변경                    | `pnpm --filter @repo/ui-core lint`, `pnpm --filter @repo/ui-core check-types`               |
| `packages/ui-composition` 변경             | `pnpm --filter @repo/ui-composition lint`, `pnpm --filter @repo/ui-composition check-types` |
| 공용 설정 또는 여러 workspace 변경         | 관련 workspace 검증 후 필요 시 `pnpm build`                                                 |

- `[필수]` `apps/server`의 `lint` 스크립트는 `--fix`를 사용합니다. 실행했다면 의도하지 않은 수정이 없는지 diff를 확인합니다.
- `[필수]` e2e 테스트는 `user` 테이블을 생성하고 비웁니다. 실제 개발·운영 데이터베이스가 아닌 전용 테스트 DB에서만 실행합니다.
- `[검증]` 완료 전 `git diff --check`를 실행합니다.
