# 미리온돈 (Miriondon)

이미 쓴 카드값과 앞으로 나갈 돈까지 반영해 남은 생활비, 카드 실적과 결제 준비액을 확인하는 가계부입니다. Next.js 클라이언트와 NestJS API를 포함한 pnpm·Turborepo 모노레포입니다.

- 서비스명: 미리온돈
- 프로젝트 식별자: `miriondon`
- 앱 패키지: `miriondon-client`, `miriondon-server`
- [제품 기획안](docs/product-plan.md) · [MVP 기능 명세서](docs/mvp-functional-spec.md) · [화면설계서](docs/screen-design.html) · [성장 검증 전략](docs/growth-strategy.md)

## Getting started

Use the Node.js version in `.nvmrc` and the pnpm version in `package.json`, then install dependencies:

```sh
pnpm install
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `apps/client` (`miriondon-client`): Next.js web client
- `apps/server` (`miriondon-server`): NestJS API and Vercel entrypoint
- `packages/ui-core` (`@repo/ui-core`): shared UI primitives and theme
- `packages/ui-composition` (`@repo/ui-composition`): shared UI compositions
- `packages/project-config` (`@repo/project-config`): shared lint and TypeScript configuration
- `docs`: product plans and the interactive HTML screen specification

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd miriondon
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```
cd miriondon
pnpm dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```
cd miriondon
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
