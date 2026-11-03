---
name: create-pr
description: Creates a GitHub pull request from the current Miriondon branch after checking the target branch, existing pull requests, commits, and remote branch.
---

# Pull Request 생성

현재 브랜치에서 GitHub Pull Request를 생성할 때 사용합니다. 이 저장소는 `main`을 기본 통합 브랜치로 사용합니다. 다른 base 브랜치가 필요하면 사용자가 명시해야 합니다.

## 작업 원칙

1. 현재 브랜치, working tree, remote를 확인합니다.
2. 현재 브랜치가 `main`이면 PR을 생성하지 않고 작업 브랜치가 필요한지 확인합니다.
3. 현재 브랜치에 이미 열려 있는 PR이 있으면 새 PR을 만들지 않고 기존 PR을 안내합니다.
4. base 브랜치는 사용자가 지정한 값을 우선하고, 지정하지 않았다면 `main`을 사용합니다. base가 존재하는지 확인합니다.
5. 제목 기본값은 마지막 커밋 메시지입니다. 사용자가 별도 제목·본문을 지정하지 않았다면 이를 사용하고, 본문은 `--fill`로 커밋 정보를 채웁니다.
6. 원격 브랜치가 없으면 PR 생성에 필요한 `git push -u origin <current-branch>`를 실행합니다.
7. PR 생성 전 변경·커밋 범위가 의도한 내용인지 확인하고, 완료 후 URL을 보고합니다.

```bash
CURRENT_BRANCH="$(git --no-pager branch --show-current)"
DEFAULT_TITLE="$(git --no-pager log -1 --pretty=%s)"

gh pr list --state open --head "$CURRENT_BRANCH" --json number,title,url
git ls-remote --exit-code --heads origin main

if ! git ls-remote --exit-code --heads origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
  git push -u origin "$CURRENT_BRANCH"
fi

gh pr create --base main --head "$CURRENT_BRANCH" --title "$DEFAULT_TITLE" --fill
```

`git push`와 `gh pr create`는 외부 상태를 변경합니다. PR 생성 요청 범위에서만 실행하며, 명령이 실패하면 원인과 필요한 조치만 보고합니다.
