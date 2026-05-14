#!/bin/sh
input=$(cat)
model=$(echo "$input" | jq -r '.model.display_name // "Claude"')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
branch=$(git -C "$(echo "$input" | jq -r '.workspace.current_dir')" --no-optional-locks rev-parse --abbrev-ref HEAD 2>/dev/null)

ctx=""
if [ -n "$used" ]; then
  ctx=" | ctx:$(printf '%.0f' "$used")%"
fi

git_part=""
if [ -n "$branch" ]; then
  git_part=" | $branch"
fi

printf "\033[1;36mBresca 1051\033[0m | %s%s%s" "$model" "$git_part" "$ctx"
