---
name: react-component
description: React and Next.js component creation, extraction, and refactoring rules for the Miriondon client.
---

# React 컴포넌트 작업

React/Next.js 컴포넌트를 생성·추출·리팩터링할 때 사용합니다. 공통 코드 규칙은 [`.ai/dev-rule.md`](../../dev-rule.md), client 경계는 [`client.md`](../../scopes/client.md)를 함께 적용합니다.

## 작업 순서

1. 대상이 여러 화면에서 재사용되는 도메인 중립 UI인지, 특정 기능 전용 조합인지 구분합니다.
2. 주변 폴더와 유사한 화면·컴포넌트의 구조, 데이터 흐름, Tailwind 사용 방식을 먼저 확인합니다.
3. App Router의 Server/Client 경계를 판단하고, state·effect·event handler·브라우저 API가 없으면 Server Component를 우선 검토합니다.
4. 데이터 조회, 상태, 라우팅, 화면 표현이 과하게 섞이면 책임을 나누되, props만 늘어나는 추상화는 만들지 않습니다.
5. loading, error, empty, success 상태와 키보드 사용 흐름을 함께 점검합니다.

## 배치와 공통화

- 여러 화면에서 구조와 상호작용이 함께 반복되거나 디자인 시스템 성격이면 `@repo/ui-core`를 검토합니다.
- 하나의 기능에 닫힌 컴포넌트와 페이지 전용 조합은 `apps/client`의 해당 기능·페이지 가까이에 둡니다.
- props가 과도하게 늘어나면 공용 컴포넌트보다 기능별 컴포넌트를 유지합니다.
- 반복되는 문자열, 상수, 옵션 매핑은 컴포넌트 밖으로 추출할지 검토하되, 한 번만 쓰이는 로직을 별도 파일로 흩어놓지 않습니다.

## UI 점검

- semantic tag와 heading 순서를 지키고, 이동은 link, 동작 실행은 `button`으로 구현합니다.
- `button`에는 적절한 `type`을 지정하고, 입력 요소는 label 또는 올바른 aria 연결을 제공합니다.
- 모달, 드롭다운, 탭 등 상호작용 UI는 focus 이동, Escape 처리, 키보드 접근성을 점검합니다.
- 색상만으로 상태를 전달하지 않고, 다크 모드와 작은 화면에서도 의미가 유지되는지 확인합니다.
- 금융 금액·잔액·기간을 표시할 때는 통화, 부호, 선택한 계좌·기간의 범위를 명확히 드러냅니다.

## 검증

```bash
pnpm --filter miriondon-client lint
pnpm --filter miriondon-client build # 라우팅 또는 Server/Client 경계 변경 시
```
