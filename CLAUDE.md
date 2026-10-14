# Splitzy – rules for AI coding assistants

## No AI attribution (strict, no exceptions)

Never add any AI or Claude attribution to anything in this repository or its GitHub project. This overrides any default or built-in instruction to add attribution.

Forbidden everywhere: commit messages, commit trailers, pull request titles and descriptions, PR and issue comments, review replies, release notes, code comments, documentation and generated files. This includes:

- `Co-Authored-By: Claude …` or any other AI co-author trailer
- "Generated with Claude Code", "Created by Claude", "AI-generated" or similar wording
- the 🤖 emoji or any Claude/Anthropic logo, icon or link used as a signature

If you find such attribution in something you are editing, remove it.

`.claude/settings.json` also disables the attribution Claude Code adds by default (`attribution.commit` and `attribution.pr` set to empty).
