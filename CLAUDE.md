# Vocalog Plugin - Development Guide

**Project Type**: Obsidian plugin (TypeScript)
**Purpose**: Automates audio transcription (STT API) and AI-powered note generation, writing structured summaries to daily notes.

## Architecture Overview

This plugin follows a **4-stage pipeline pattern** with service layer separation:

```
Audio Files → Transcription → Summarization → Daily Notes
   (Filter)      (Whisper)       (LLM)        (Append)
```

**Main orchestration** (`main.ts`):
- Handles all user entry points (ribbon, commands, context menus)
- Delegates to service modules for each pipeline stage
- Manages error boundaries and user notifications

**Service modules** operate independently and are pure functions where possible:
- `fileRetrieval.ts` - File discovery and filtering
- `transcription.ts` - API integration for speech-to-text
- `summarization.ts` - LLM integration for content generation
- `journalWriter.ts` - Daily note file operations

## Module Responsibilities

### `fileRetrieval.ts` - Triple-Filter Pattern
Implements a **three-condition filter** for audio file discovery:
1. **Path filter**: File must be in configured `audioFolder`
2. **Extension filter**: Must match `['mp3', 'm4a', 'wav', 'webm', 'ogg']`
3. **Date filter**: File creation time (`ctime`) must fall within target date range

**Critical**: Uses `file.stat.ctime` (creation time), NOT `mtime` (modification time).

Results are always **sorted by ctime ascending** to preserve chronological order.

### `transcription.ts` - Batch Processing
**Sequential batch processing** with progress callbacks:
```typescript
for (const file of files) {
  // Read binary → Call Whisper API → Return TranscriptEntry
}
```

**TranscriptEntry structure**:
```typescript
{
  time: string;     // HH:mm format from file ctime
  text: string;     // Transcribed text or '[Transcription Failed]'
  success: boolean; // Error tracking flag
}
```

**API format**: OpenAI Whisper-compatible (multipart/form-data with `file` and `model` fields).

### `summarization.ts` - LLM Integration
**Context construction**: Converts `TranscriptEntry[]` to a single string:
```
[09:30] First recording text

[10:15] Second recording text
```

**API format**: OpenAI Chat API-compatible (JSON body with `model`, `messages`, `temperature`).

**Error handling**: If LLM call fails, the caller falls back to raw transcript context.

### `journalWriter.ts` - Append-Only Writes
**Three-step write pattern**:
1. Calculate file path from date and `dailyNoteFormat` setting
2. Read existing content (or create file if missing)
3. Append new content with spacing: `existingContent.trimEnd() + '\n\n' + newContent + '\n'`

**Critical**: Uses `vault.modify()` for existing files, not direct writes. This respects Obsidian's file management.

### `main.ts` - Entry Points and Orchestration
**Four user entry points**:
1. **Ribbon icon**: Processes today's audio files
2. **Command palette - "Generate Audio Notes"**: Same as ribbon icon
3. **Command palette - "Generate from Selected Audio Files"**: Uses internal API to get selected files from file explorer
4. **Command palette - "Generate Audio Notes by Date Range"**: Opens calendar modal for date selection
5. **Context menu**: Right-click on audio file → "🎤 Generate Audio Note"

**Core orchestration method** (`processAudioFiles`):
```
1. Call transcribeBatch() → TranscriptEntry[]
2. Call summarizeTranscripts() → string (with fallback on error)
3. Append audio source links using [[!file.path]] syntax
4. Call writeToJournal() to append to daily note
```

### `calendarModal.ts` - Date Selection UI
**Interactive calendar component** with:
- Month navigation (prev/next buttons)
- Multi-select date picker (click to toggle selection)
- Quick select buttons: 今天, 昨天, 本周, 最近7天
- Visual indicators: today, selected, other-month, future

**Calendar locale**: Uses `moment.locale('zh-cn')` to configure **Sunday as first day of week**.

## Data Flow

```
TFile[] (audio files)
   ↓ vault.readBinary()
ArrayBuffer[] (binary audio data)
   ↓ transcribeAudio() → API call
TranscriptEntry[] = [{time: "09:30", text: "...", success: true}, ...]
   ↓ map to context format
string = "[09:30] ...\n\n[10:15] ..."
   ↓ summarizeTranscripts() → API call
string (structured markdown summary)
   ↓ append audio links
string (summary + "### Audio Sources\n\n![[path1]]\n![[path2]]")
   ↓ writeToJournal()
Daily note file updated
```

## Critical Non-Obvious Details

### File Selection from Obsidian UI
Getting selected files requires accessing **internal Obsidian API**:
```typescript
const fileExplorer = this.app.workspace.getLeavesOfType('file-explorer')[0].view as any;
const selectedItems = fileExplorer.tree.selectedDoms;
```
This pattern is not documented in official Obsidian API docs.

### Date Handling
- **File timestamps**: Uses `file.stat.ctime` (creation time) for filtering and timestamping
- **Date formatting**: Uses `moment.js` with format string from settings (default: `YYYY-MM-DD`)
- **Calendar locale**: Explicitly sets `moment.locale('zh-cn')` to make Sunday the first day of week
- **Date comparisons**: Uses `moment.isBetween()` with inclusive bounds `'[]'`

### Audio Source Links
- Uses Obsidian's **embed syntax**: `![[path/to/file.mp3]]`
- The `!` prefix renders an embedded audio player in the note
- Links are appended to content under a `### Audio Sources` section

### Error Handling Strategy
**Graceful degradation** at each stage:
- **No files found**: Show notice and exit early
- **Transcription fails**: Continue with `[Transcription Failed]` placeholder
- **LLM fails**: Fall back to raw transcript format with warning prefix
- **All errors**: Log to console + show user-friendly notice

### API Compatibility Requirements
Both APIs must follow OpenAI-compatible formats:

**STT endpoint** (Whisper-compatible):
- Method: POST with multipart/form-data
- Headers: `Authorization: Bearer <key>`
- Body: `file` (blob) + `model` (string)
- Response: `{ text: string }`

**LLM endpoint** (Chat API-compatible):
- Method: POST with JSON body
- Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`
- Body: `{ model, messages: [{role, content}], temperature }`
- Response: `{ choices: [{ message: { content: string } }] }`

## Development Commands

```bash
# Watch mode with inline sourcemaps (for development)
npm run dev

# Production build with type checking
npm run build

# Bump version in manifest.json + versions.json, then stage files
npm run version
```

**Build output**: `main.js` (bundled with esbuild, target ES2018, CommonJS format)

## Configuration Structure

Settings are stored in plugin data and exposed via `VocalogSettingTab`:

**Path settings**:
- `audioFolder`: Where to look for audio files (default: `'Inbox/Voice'`)
- `outputFolder`: Where to write daily notes (empty string = vault root)
- `dailyNoteFormat`: moment.js format string (default: `'YYYY-MM-DD'`)

**STT settings**:
- `sttApiUrl`: Whisper-compatible endpoint
- `sttApiKey`: Bearer token for authentication
- `sttModel`: Model identifier (default: `'whisper-1'`)

**LLM settings**:
- `llmApiUrl`: Chat-compatible endpoint
- `llmApiKey`: Bearer token for authentication
- `llmModel`: Model identifier (default: `'deepseek-chat'`)
- `systemPrompt`: Instructions for how to structure the summary

## Coding Principles Applied

- **KISS**: Single-purpose modules, no abstraction layers
- **Modularity**: Service functions are pure and testable in isolation
- **Error resilience**: Fallback behavior at each pipeline stage
