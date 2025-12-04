---
name: VideoToText
description: Extract YouTube video transcripts for AI analysis. Enables fabric pattern processing on video content. USE WHEN encountering YouTube URLs during research, user asks to "analyze this video", "summarize this YouTube", "extract wisdom from video", or any video content analysis request. Works for main agent and all sub-agents including researchers.
---

# Video to Text - YouTube Transcript Extraction

## When to Activate This Skill

**Automatic activation for:**
- Any YouTube URL encountered during research tasks
- "Analyze this video: [URL]"
- "Summarize this YouTube video"
- "Extract wisdom from this video"
- "What does this video talk about?"
- "Get the transcript from [YouTube URL]"
- Research tasks that return YouTube URLs as relevant sources

**URL Pattern Detection:**
- `youtube.com/watch?v=`
- `youtu.be/`
- `youtube.com/embed/`
- `youtube.com/v/`

## Quick Start

### Basic Transcript Extraction
```bash
# Extract transcript (no timestamps - default)
fabric -y "https://www.youtube.com/watch?v=VIDEO_ID" --transcript

# Extract with timestamps (for chapter creation or time references)
fabric -y "https://www.youtube.com/watch?v=VIDEO_ID" --transcript-with-timestamps
```

### Direct Pattern Processing
```bash
# Extract and process in one command
fabric -y "https://www.youtube.com/watch?v=VIDEO_ID" -p extract_wisdom
fabric -y "https://www.youtube.com/watch?v=VIDEO_ID" -p summarize
fabric -y "https://www.youtube.com/watch?v=VIDEO_ID" -p youtube_summary
```

## Context-Based Pattern Selection

When processing video content, automatically select the fabric pattern based on user intent:

| User Intent | Recommended Pattern | When to Use |
|-------------|---------------------|-------------|
| Research/learning | `extract_wisdom` | Default for research tasks |
| Quick overview | `summarize` or `youtube_summary` | User wants brief summary |
| Key takeaways | `extract_insights` | Focus on actionable insights |
| Main message | `extract_main_idea` | Single core concept |
| Study material | `create_flash_cards` | Learning/retention |
| Content structure | `create_video_chapters` | Video organization |
| Recommendations | `extract_recommendations` | Actionable advice |
| Technical analysis | `analyze_paper` | Technical/educational content |
| Security content | `create_threat_model` | Security-focused videos |

## Workflow for Researcher Agents

When a researcher agent finds a YouTube URL:

1. **Detect YouTube URL** in search results or references
2. **Extract transcript** using fabric
3. **Process with appropriate pattern** based on research context
4. **Include processed content** in research findings

### Example Research Integration
```bash
# Researcher finds: https://www.youtube.com/watch?v=Vkz7WTzH4aQ
# Topic: "AI Cloud Security 2025"

# Step 1: Extract and analyze
fabric -y "https://www.youtube.com/watch?v=Vkz7WTzH4aQ" -p extract_wisdom

# Step 2: Include in research output with source attribution
```

## Two-Step Workflow (When Pattern Selection Needed)

For complex analysis or when piping to multiple patterns:

```bash
# Step 1: Extract raw transcript
fabric -y "URL" --transcript > /tmp/video_transcript.txt

# Step 2: Process with one or more patterns
cat /tmp/video_transcript.txt | fabric -p extract_wisdom
cat /tmp/video_transcript.txt | fabric -p summarize
cat /tmp/video_transcript.txt | fabric -p create_video_chapters
```

## Options Reference

| Flag | Purpose | Default |
|------|---------|---------|
| `--transcript` | Plain transcript text | Yes |
| `--transcript-with-timestamps` | Include time markers | No |
| `--comments` | Include video comments | No |
| `--metadata` | Include video metadata | No |
| `-p PATTERN` | Process with fabric pattern | None |
| `-o FILE` | Save output to file | None |

## Error Handling

**Common issues:**
- **No transcript available**: Some videos don't have captions/transcripts
- **Private/deleted video**: Cannot access content
- **Age-restricted content**: May require authentication
- **Very long videos**: May take longer to process

**Fallback approach:**
If transcript extraction fails, inform user and suggest:
1. Check if video has captions enabled
2. Try alternative video covering same topic
3. Use video description/comments if available

## Integration with Other Skills

- **fabric**: Process transcripts with any of 242+ patterns
- **research**: Enrich research with video content analysis
- **story-explanation**: Create narrative summaries from video content
- **citation-creation**: Properly cite video sources

## Sub-Agent Instructions

When delegating video analysis to sub-agents:

```markdown
Task: "Analyze this video for [TOPIC]"

Instructions:
1. Use video-to-text skill
2. Extract transcript: fabric -y "URL" --transcript
3. Process with pattern: [extract_wisdom | summarize | etc.]
4. Include key findings in your report
5. Attribute source: "From YouTube video: [TITLE]"
```

## Examples

### Example 1: Research Task Finds Video
```
Context: Researching "AI Cloud Security 2025"
Found: https://www.youtube.com/watch?v=Vkz7WTzH4aQ

Action:
1. Detect YouTube URL
2. Run: fabric -y "URL" -p extract_wisdom
3. Include wisdom points in research findings
```

### Example 2: User Requests Video Summary
```
User: "Summarize this video: [YouTube URL]"

Action:
1. Run: fabric -y "URL" -p youtube_summary
2. Present summary to user
```

### Example 3: Extract Multiple Insights
```
User: "I want wisdom, recommendations, and a summary from this talk"

Action:
1. Extract transcript once: fabric -y "URL" --transcript > /tmp/vid.txt
2. Run multiple patterns:
   - cat /tmp/vid.txt | fabric -p extract_wisdom
   - cat /tmp/vid.txt | fabric -p extract_recommendations
   - cat /tmp/vid.txt | fabric -p summarize
3. Compile and present results
```

## Future Extension Points

This skill is designed to potentially support:
- Vimeo transcripts (when tooling available)
- Podcast audio transcription
- Local video file transcription
- Multi-language transcript handling

Currently focused on YouTube as primary source due to fabric's built-in support.
