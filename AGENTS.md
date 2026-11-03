# AGENTS.md — miriondon

## Rule Hierarchy & Scopes

- Core dev rules: [`.ai/dev-rule.md`](.ai/dev-rule.md)
- Domain rules (finance/ledger): [`.ai/domain-rule.md`](.ai/domain-rule.md)
- Git & commit rules: [`.ai/git-rule.md`](.ai/git-rule.md)
- Scope rules:
  - Client (`apps/client/**`): [`.ai/scopes/client.md`](.ai/scopes/client.md)
  - Design (`apps/design/**`): [`.ai/scopes/design.md`](.ai/scopes/design.md)
  - Server (`apps/server/**`): [`.ai/scopes/server.md`](.ai/scopes/server.md)
  - Shared (`packages/**`): [`.ai/scopes/shared-packages.md`](.ai/scopes/shared-packages.md)
- Specific skills:
  - React/Next.js components (create, extract, refactor): [`.ai/skills/react-component/SKILL.md`](.ai/skills/react-component/SKILL.md)
  - Design app screen & token workflow: [`.ai/skills/design-app/SKILL.md`](.ai/skills/design-app/SKILL.md)
  - PR creation: [`.ai/skills/create-pr/SKILL.md`](.ai/skills/create-pr/SKILL.md)

Precedence: Specific skills > Scope rules > This file > Common rules.
Rule levels:

- `[필수]` (Mandatory): Violations strictly block completion.
- `[검증]` (Verification): Must verify via commands or diff before finishing.
- `[권장]` (Recommended): Follow unless explicitly reasoned otherwise.

Documentation rule: When writing or updating documents (`docs/**`, `.ai/**`, `*.md`), record ONLY the final current state. NEVER include changelogs, background history, or interview/conversation narratives unless explicitly requested.

## Response & Behavioral Rules

- **Direct & Concise Communication**:
  - Respond in Korean unless explicitly requested otherwise.
  - Jump straight to the point (conclusions, analyses, results) on line 1. NEVER include greetings, praise/flattery ("Great idea!", etc.), routine apologies ("Sorry"), or boilerplate concluding summaries.
  - Prioritize user-specified formats and ordering if provided.
  - Technical/execution outputs: Prefer bulleted noun-phrase/truncated endings in Korean (`~함`, `~임`, `~필요`).
  - Strategy/architecture: Use plain, crisp prose with clear rationales, preconditions/assumptions, and tradeoffs.
  - Complex questions: State reasoning briefly in prose, execution steps in bullets, and code in blocks.
- **Objective Analysis & Blunt Critique**:
  - Strictly distinguish verified facts from assumptions. Ground explanations in real code, concrete data, and edge cases—never vague adjectives or baseless optimism.
  - Avoid noncommittal balance ("it depends") or unconditional agreement. If the user's premise has flaws, underappreciated risks, or inefficiencies, point them out bluntly and counter-propose a clear recommendation with tradeoffs.
- **Minimal Changes with High Quality**:
  - Deliver minimal necessary diffs, but never write messy workarounds that sacrifice readability or stability.
- **Tool Economy**:
  - Restrict research and tool calls to the minimum required for accuracy and completion. Stop immediately once sufficient evidence is found.
- **Execution Control (Ask vs Execute)**:
  - **Confirm First**: Stop and get explicit approval before modifying code (unless explicitly pre-approved/instructed by the user) for:
    1. Pure opinion/review requests: Provide review and rationale only; do not modify code.
    2. Critical decision forks with diverging paths: Ask multiple-choice/short-answer questions with recommendations and tradeoffs.
    3. Fundamental refactoring or major structural changes: Brief `[Current Limitations vs Proposed Design]`.
  - **Execute Immediately**: For clear operational tasks outside the above three cases (or once approved), execute file edits, dependency installs, and build/lint/test commands immediately without asking permission ("Shall I edit?"), provided there is no critical security threat.
