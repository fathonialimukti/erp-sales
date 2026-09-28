### Task 8: Trim Agent Config Bloated Files

**Files:**
- Modify: `opencode.json`
- Modify: `.github/agents/full-stack-engineer.agent.md`
- Modify: `.opencode/agents/full-stack-engineer.md`
- Test: none (config only)

**Interfaces:**
- Consumes: user request "trim what bloated, make it work more professional"
- Produces: trimmed config files, exact lines removed

**Reads (in your own context — no context is provided):**
- `opencode.json`
- `.github/agents/full-stack-engineer.agent.md`
- `.opencode/agents/full-stack-engineer.md`

**Frozen contract:**
- Trim only. Do NOT change model IDs, provider config, MCP server URLs, permission semantics, or agent behavior.
- Do NOT touch any apps/* or packages/* code.
- Do NOT touch docs/plans/** (out of scope).

**Steps:**
- [ ] Step 1: `opencode.json` — delete the dead `css_first` MCP block (disabled remote server, never used) and the `blacklist` array (6 dead model IDs that no longer exist). Keep everything else: provider, models, MCP servers, permission, model/small_model.
- [ ] Step 2: `.github/agents/full-stack-engineer.agent.md` — delete the `tools:` frontmatter line (references VSCode-specific tools this agent doesn't use), the `agents:` frontmatter line (redundant — delegation is already in the body), and the `user-invocable:` line (non-standard key). Body is fine, leave it.
- [ ] Step 3: `.opencode/agents/full-stack-engineer.md` — trim the `permission.bash` deny-list (17 near-identical deny rules: `npm publish*`, `bun publish*`, `rm -rf*`, `rm -fr*`, `chmod*`, `sudo*`, `npm install -g*`, `bun install -g*`, etc.). The broad `"*": deny` on bash already covers these. Keep only the meaningful ones: `git add*`, `git commit*`, `git push*`, `git merge*`, `gh pr create*`, `gh pr merge*`, `gh workflow run*`. Body is fine, leave it.
- [ ] Step 4: Self-review — verify JSON still parses, agent files still have valid frontmatter, no behavior change.

**Preservation (mandatory):** additive-only in spirit — these are deletions of dead config, not removal of features. Do not delete any model, provider, MCP server, or permission that is actually in use.

**Report back (mandatory):**
End with `## Produces` listing exact files + exact lines removed + line counts before/after.