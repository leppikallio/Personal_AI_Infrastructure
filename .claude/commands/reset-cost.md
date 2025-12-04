# Reset Cost Counter

Reset the cost tracking counter for project or session.

## Usage

```
/reset-cost [project|session]
```

## Arguments

- `project` - Reset the project cost counter (persists across days)
- `session` - Reset the session cost counter (auto-resets daily)

## Instructions

Based on the argument provided: $ARGUMENTS

Execute the appropriate reset:

### If argument is "project":
```bash
claude_dir="${PAI_DIR:-$HOME/.claude}"
echo $(date +%Y%m%d) > "$claude_dir/cost_reset_project"
echo "Project cost counter reset to $(date +%Y-%m-%d)"
```

### If argument is "session":
```bash
claude_dir="${PAI_DIR:-$HOME/.claude}"
echo $(date +%Y%m%d) > "$claude_dir/cost_reset_session"
echo "Session cost counter reset to $(date +%Y-%m-%d)"
```

### If no argument or invalid argument:
Show usage help:
```
Usage: /reset-cost [project|session]

  project  - Reset project counter (for tracking initiatives, features, client work)
  session  - Reset session counter (for tracking current task, already auto-resets daily)

Examples:
  /reset-cost project   - Start tracking a new project
  /reset-cost session   - Reset mid-day for a specific task
```

After executing the reset, clear the ccusage cache so the statusline updates immediately:
```bash
rm -f /tmp/.claude_ccusage_cache
```

Confirm the reset was successful and remind the user that the statusline will update on next refresh.
