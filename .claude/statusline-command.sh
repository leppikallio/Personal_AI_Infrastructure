#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Get Digital Assistant configuration from environment
DA_NAME="${DA:-Assistant}"  # Assistant name
DA_COLOR="${DA_COLOR:-purple}"  # Color for the assistant name

# Extract data from JSON input
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')
model_name=$(echo "$input" | jq -r '.model.display_name')

# Get directory name
dir_name=$(basename "$current_dir")

# Cache file and lock file for ccusage data
CACHE_FILE="/tmp/.claude_ccusage_cache"
LOCK_FILE="/tmp/.claude_ccusage.lock"
CACHE_AGE=30   # 30 seconds for more real-time updates

# Count items from specified directories
claude_dir="${PAI_DIR:-$HOME/.claude}"
commands_count=0
mcps_count=0
fabric_count=0

# Count commands (optimized - direct ls instead of find)
if [ -d "$claude_dir/commands" ]; then
    commands_count=$(ls -1 "$claude_dir/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
fi

# Count MCPs from ~/.claude.json (global Claude config)
mcp_names_raw=""
claude_global_config="$HOME/.claude.json"
if [ -f "$claude_global_config" ]; then
    mcp_data=$(jq -r '.mcpServers | keys | join(" "), length' "$claude_global_config" 2>/dev/null)
    mcp_names_raw=$(echo "$mcp_data" | head -1)
    mcps_count=$(echo "$mcp_data" | tail -1)
else
    mcps_count="0"
fi

# Count Fabric patterns (optimized - count subdirectories)
fabric_patterns_dir="${HOME}/.config/fabric/patterns"
if [ -d "$fabric_patterns_dir" ]; then
    # Count immediate subdirectories only
    fabric_count=$(find "$fabric_patterns_dir" -maxdepth 1 -type d -not -path "$fabric_patterns_dir" 2>/dev/null | wc -l | tr -d ' ')
fi

# Get cached ccusage data - SAFE VERSION without background processes
daily_tokens=""
daily_cost=""
project_cost=""
session_cost=""
cached_dir=""

# Reset date files
SESSION_RESET_FILE="$claude_dir/cost_reset_session"

# Check if cache exists and load it
if [ -f "$CACHE_FILE" ]; then
    # Always load cache data first (if it exists)
    source "$CACHE_FILE"
fi

# If cache is stale, missing, we have no data, or directory changed, update SYNCHRONOUSLY
cache_needs_update=false
if [ ! -f "$CACHE_FILE" ] || [ -z "$daily_tokens" ]; then
    cache_needs_update=true
elif [ -f "$CACHE_FILE" ]; then
    # Check if directory changed (project cost depends on current_dir)
    if [ "$cached_dir" != "$current_dir" ]; then
        cache_needs_update=true
    else
        cache_age=$(($(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || echo 0)))
        if [ $cache_age -ge $CACHE_AGE ]; then
            cache_needs_update=true
        fi
    fi
fi

# Helper function to extract cost from ccusage output
extract_cost() {
    local output="$1"
    if [ -n "$output" ]; then
        echo "$output" | awk -F'│' '{print $9}' | sed 's/^ *//;s/ *$//'
    else
        echo "\$0.00"
    fi
}

# Helper function to run ccusage with timeout
run_ccusage() {
    local args="$1"
    local result=""
    if command -v gtimeout >/dev/null 2>&1; then
        result=$(gtimeout 5 bunx ccusage $args 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
    elif command -v timeout >/dev/null 2>&1; then
        result=$(timeout 5 bunx ccusage $args 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
    else
        result=$(bunx ccusage $args 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
    fi
    echo "$result"
}

if [ "$cache_needs_update" = true ]; then
    # Try to acquire lock (non-blocking)
    if mkdir "$LOCK_FILE" 2>/dev/null; then
        # We got the lock - update cache with timeout
        if command -v bunx >/dev/null 2>&1; then
            # Get TOTAL cost (no date filter)
            ccusage_output=$(run_ccusage "")

            if [ -n "$ccusage_output" ]; then
                # Extract input/output tokens, removing commas and ellipsis
                daily_input=$(echo "$ccusage_output" | awk -F'│' '{print $4}' | sed 's/[^0-9]//g' | head -c 10)
                daily_output=$(echo "$ccusage_output" | awk -F'│' '{print $5}' | sed 's/[^0-9]//g' | head -c 10)
                daily_cost=$(extract_cost "$ccusage_output")

                if [ -n "$daily_input" ] && [ -n "$daily_output" ]; then
                    daily_total=$((daily_input + daily_output))
                    daily_tokens=$(printf "%'d" "$daily_total" 2>/dev/null || echo "$daily_total")
                fi
            fi

            # Get PROJECT cost (prefix-matching aggregation)
            # Convert path: /Users/zuul/Projects/PAI/.claude → -Users-zuul-Projects-PAI--claude
            # Note: ccusage encodes /. as -- (dot is removed), / as -
            project_prefix=$(echo "$current_dir" | sed 's|/\.|--|g; s|/|-|g')
            project_cost=$(bunx ccusage -i --json 2>/dev/null | \
                jq -r --arg prefix "$project_prefix" '
                .projects | to_entries |
                map(select(.key | startswith($prefix))) |
                map(.value | map(.totalCost) | add) |
                add // 0
                ' 2>/dev/null)
            if [ -n "$project_cost" ] && [ "$project_cost" != "null" ] && [ "$project_cost" != "0" ]; then
                project_cost=$(echo "$project_cost" | LC_ALL=C awk '{printf "$%.2f", $1}')
            else
                project_cost="$daily_cost"  # Fallback
            fi

            # Get SESSION cost (since today OR session reset, whichever is later)
            today=$(date +%Y%m%d)
            session_date="$today"  # Default to today (auto daily reset)
            if [ -f "$SESSION_RESET_FILE" ]; then
                stored_session=$(cat "$SESSION_RESET_FILE")
                # Use whichever is more recent
                if [[ "$stored_session" > "$today" ]] || [[ "$stored_session" == "$today" ]]; then
                    session_date="$stored_session"
                fi
            fi
            session_output=$(run_ccusage "--since $session_date")
            session_cost=$(extract_cost "$session_output")

            # Write to cache file
            if [ -n "$daily_tokens" ]; then
                echo "daily_tokens=\"$daily_tokens\"" > "$CACHE_FILE"
                printf "daily_cost=\"%s\"\n" "${daily_cost//$/\\$}" >> "$CACHE_FILE"
                printf "project_cost=\"%s\"\n" "${project_cost//$/\\$}" >> "$CACHE_FILE"
                printf "session_cost=\"%s\"\n" "${session_cost//$/\\$}" >> "$CACHE_FILE"
                echo "cached_dir=\"$current_dir\"" >> "$CACHE_FILE"
                echo "cache_updated=\"$(date)\"" >> "$CACHE_FILE"
            fi
        fi

        # Always remove lock when done
        rmdir "$LOCK_FILE" 2>/dev/null
    else
        # Someone else is updating - check if lock is stale (older than 30 seconds)
        if [ -d "$LOCK_FILE" ]; then
            lock_age=$(($(date +%s) - $(stat -f%m "$LOCK_FILE" 2>/dev/null || echo 0)))
            if [ $lock_age -gt 30 ]; then
                # Stale lock - remove it and try again
                rmdir "$LOCK_FILE" 2>/dev/null
            fi
        fi

        # Just use cached data if available
        if [ -f "$CACHE_FILE" ]; then
            source "$CACHE_FILE"
        fi
    fi
fi

# Tokyo Night Storm Color Scheme
BACKGROUND='\033[48;2;36;40;59m'
BRIGHT_PURPLE='\033[38;2;187;154;247m'
BRIGHT_BLUE='\033[38;2;122;162;247m'
DARK_BLUE='\033[38;2;100;140;200m'
BRIGHT_GREEN='\033[38;2;158;206;106m'
DARK_GREEN='\033[38;2;130;170;90m'
BRIGHT_ORANGE='\033[38;2;255;158;100m'
BRIGHT_RED='\033[38;2;247;118;142m'
BRIGHT_CYAN='\033[38;2;125;207;255m'
BRIGHT_MAGENTA='\033[38;2;187;154;247m'
BRIGHT_YELLOW='\033[38;2;224;175;104m'

# Map DA_COLOR to actual ANSI color code
case "$DA_COLOR" in
    "purple") DA_DISPLAY_COLOR='\033[38;2;147;112;219m' ;;
    "blue") DA_DISPLAY_COLOR="$BRIGHT_BLUE" ;;
    "green") DA_DISPLAY_COLOR="$BRIGHT_GREEN" ;;
    "cyan") DA_DISPLAY_COLOR="$BRIGHT_CYAN" ;;
    "magenta") DA_DISPLAY_COLOR="$BRIGHT_MAGENTA" ;;
    "yellow") DA_DISPLAY_COLOR="$BRIGHT_YELLOW" ;;
    "red") DA_DISPLAY_COLOR="$BRIGHT_RED" ;;
    "orange") DA_DISPLAY_COLOR="$BRIGHT_ORANGE" ;;
    *) DA_DISPLAY_COLOR='\033[38;2;147;112;219m' ;;  # Default to purple
esac

# Line-specific colors
LINE1_PRIMARY="$BRIGHT_PURPLE"
LINE1_ACCENT='\033[38;2;160;130;210m'
MODEL_PURPLE='\033[38;2;138;99;210m'

LINE2_PRIMARY="$DARK_BLUE"
LINE2_ACCENT='\033[38;2;110;150;210m'

LINE3_PRIMARY="$DARK_GREEN"
LINE3_ACCENT='\033[38;2;140;180;100m'
COST_COLOR="$LINE3_ACCENT"
TOKENS_COLOR='\033[38;2;169;177;214m'

SEPARATOR_COLOR='\033[38;2;140;152;180m'
DIR_COLOR='\033[38;2;135;206;250m'

# MCP colors
MCP_DAEMON="$BRIGHT_BLUE"
MCP_STRIPE="$LINE2_ACCENT"
MCP_DEFAULT="$LINE2_PRIMARY"

RESET='\033[0m'

# Format MCP names efficiently
mcp_names_formatted=""
for mcp in $mcp_names_raw; do
    case "$mcp" in
        "daemon") formatted="${MCP_DAEMON}Daemon${RESET}" ;;
        "stripe") formatted="${MCP_STRIPE}Stripe${RESET}" ;;
        "httpx") formatted="${MCP_DEFAULT}HTTPx${RESET}" ;;
        "brightdata") formatted="${MCP_DEFAULT}BrightData${RESET}" ;;
        "naabu") formatted="${MCP_DEFAULT}Naabu${RESET}" ;;
        "apify") formatted="${MCP_DEFAULT}Apify${RESET}" ;;
        "content") formatted="${MCP_DEFAULT}Content${RESET}" ;;
        "Ref") formatted="${MCP_DEFAULT}Ref${RESET}" ;;
        "pai") formatted="${MCP_DEFAULT}Foundry${RESET}" ;;
        "playwright") formatted="${MCP_DEFAULT}Playwright${RESET}" ;;
        "context7") formatted="${MCP_DEFAULT}Context7${RESET}" ;;
        *)
            # Capitalize first letter (bash 3.x compatible)
            first_char=$(echo "${mcp:0:1}" | tr '[:lower:]' '[:upper:]')
            rest="${mcp:1}"
            formatted="${MCP_DEFAULT}${first_char}${rest}${RESET}"
            ;;
    esac

    if [ -z "$mcp_names_formatted" ]; then
        mcp_names_formatted="$formatted"
    else
        mcp_names_formatted="$mcp_names_formatted${SEPARATOR_COLOR}, ${formatted}"
    fi
done

# Output the full 3-line statusline
# LINE 1 - PURPLE theme with all counts
printf "${DA_DISPLAY_COLOR}${DA_NAME}${RESET}${LINE1_PRIMARY} here, running on ${MODEL_PURPLE}🧠 ${model_name}${RESET}${LINE1_PRIMARY} in ${DIR_COLOR}📁 ${dir_name}${RESET}${LINE1_PRIMARY}, wielding: ${RESET}${LINE1_PRIMARY}⚙️ ${commands_count} Commands${RESET}${LINE1_PRIMARY}, ${RESET}${LINE1_PRIMARY}🔌 ${mcps_count} MCPs${RESET}${LINE1_PRIMARY}, and ${RESET}${LINE1_PRIMARY}📚 ${fabric_count} Patterns${RESET}\n"

# LINE 2 - BLUE theme with MCP names
printf "${LINE2_PRIMARY}🔌 MCPs${RESET}${LINE2_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${mcp_names_formatted}${RESET}\n"

# LINE 3 - GREEN theme with tokens and cost (show cached or N/A)
# If we have cached data but it's empty, still show N/A
tokens_display="${daily_tokens:-N/A}"
cost_display="${daily_cost:-N/A}"
project_display="${project_cost:-N/A}"
session_display="${session_cost:-N/A}"
if [ -z "$daily_tokens" ]; then tokens_display="N/A"; fi
if [ -z "$daily_cost" ]; then cost_display="N/A"; fi
if [ -z "$project_cost" ]; then project_display="N/A"; fi
if [ -z "$session_cost" ]; then session_display="N/A"; fi

printf "${LINE3_PRIMARY}💎 Total${RESET}${LINE3_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${COST_COLOR}${cost_display}${RESET}${LINE3_PRIMARY}  📁 Project${RESET}${LINE3_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${COST_COLOR}${project_display}${RESET}${LINE3_PRIMARY}  ⚡ Today${RESET}${LINE3_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${COST_COLOR}${session_display}${RESET}\n"
