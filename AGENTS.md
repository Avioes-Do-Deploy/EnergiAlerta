## Skills — STOP. Load a skill before you act.

You, as an AI Agent, ships skills (playbooks). They only work if you load them.

**The rule:** before you do ANYTHING non-trivial — before you `explore`, run `bash`,
write code, or answer — STOP and check the skills index. If a skill might fit, load it.
Loading a skill is cheap. Skipping it is the #1 mistake. Process skill FIRST. Action SECOND.

Do NOT jump straight to `explore` or `bash` or a direct answer. The skill tells you HOW
to explore, debug, build, and verify. So it comes first, every time.

Match the situation:

| If…                                                     | Load this FIRST                                |
| ------------------------------------------------------- | ---------------------------------------------- |
| starting a feature, or you have a rough idea            | **superpowers-brainstorming**                  |
| a bug, a failing or flaky test, or anything surprising  | **superpowers-systematic-debugging**           |
| writing or fixing any code                              | **superpowers-test-driven-development**        |
| you have a spec for a multi-step task                   | **superpowers-writing-plans**                  |
| executing a written plan in this session                | **superpowers-executing-plans**                |
| about to say "done" / "fixed" / "passing"               | **superpowers-verification-before-completion** |
| work is done and tests pass                             | **superpowers-finishing-a-development-branch** |
| you got code-review feedback (from `review` or a human) | **superpowers-receiving-code-review**          |
| need an isolated workspace                              | **superpowers-using-git-worktrees**            |
| making or editing a skill                               | **superpowers-writing-skills**                 |

Load it: `run_skill({ name: "<skill-name>", arguments: "<the task>" })`.

These skills **supplement** Reasonix's native tools — they don't replace them. For
dispatching subagents, code review, parallel work, and codebase exploration, use the
native tools directly: **`task`** (run a subagent), **`review`** (code-review a diff),
**`wait`** (join parallel jobs), **`explore`** (investigate the codebase). There is no
skill for these — reach for the native tool.

If you catch yourself about to explore, fix, or answer without loading a skill — STOP and load it.

## Red flags — these thoughts mean STOP. You are rationalizing.

| You think                           | Reality                                          |
| ----------------------------------- | ------------------------------------------------ |
| "Just a simple question"            | Questions are tasks. Check for a skill.          |
| "Let me explore / look first"       | The skill tells you HOW to explore. Skill first. |
| "I'll just do this one thing first" | Check BEFORE doing anything.                     |
| "This skill is overkill"            | Simple turns complex. Load it.                   |
| "I already know this"               | Knowing ≠ doing. Load the current skill.         |

If more than one skill fits, load the **process skill first** — superpowers-brainstorming,
superpowers-systematic-debugging, superpowers-verification-before-completion — then the implementation skill.
"Build X" → superpowers-brainstorming first. "Fix this bug" → superpowers-systematic-debugging first.

## Priority

1. The user's explicit instructions (this file, `REASONIX.md`, direct asks) win over everything.
2. Skills override default behavior where they conflict.
3. A user request says WHAT to do, never "skip the skill." "Add X" still means: load the skill, then add X.

---

# Sobre o Projeto

O OBJETIVO DESSE PROJETO NÃO É APRENDER! Esse é um repositório `template` que estou construindo para um hackathon, portanto, deve-se apenas implementar o boilerplate necessário.

Características do Hackathon em questão:

- Duração de 8 horas diretas
- Esfera temática de teor social/econômico/ambiental com recorte principalmente baiano
- Foco da banca avaliadora nos critérios relacionados à adequação ao tema e criatividade da solução, viabilidade do produto e experiência do usuário

## Instruções de Prioridade Absoluta

1. Nunca, **em hipótese alguma**, você deve ler um arquivo `.env` ou derivados; sendo a única exceção o `.env.example`;
2. Não perca tempo explorando diretórios presentes no(s) `.gitignore`;
3. Além das skills explicitamente já citadas, você ainda possui outras para outros propósitos. A ordem de checá-las antes de fazer qualquer outra coisa se mantém;
4. Antes de sair explorando, cheque o [diretório do Grapghify](./graphify-out) (se existente) para compreender a estrutura da codebase e saber exatamente onde deve ir
