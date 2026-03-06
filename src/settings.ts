import { App, PluginSettingTab, Setting } from 'obsidian';
import type VocalogPlugin from './main';

export interface VocalogSettings {
	// 基础配置
	audioFolder: string;
	outputFolder: string;
	dailyNoteFormat: string;

	// STT 配置
	sttApiUrl: string;
	sttApiKey: string;
	sttModel: string;

	// LLM 配置
	llmApiUrl: string;
	llmApiKey: string;
	llmModel: string;
	systemPrompt: string;
}

export const DEFAULT_SETTINGS: VocalogSettings = {
	audioFolder: 'Inbox/Voice',
	outputFolder: '',  // 空字符串表示使用根目录
	dailyNoteFormat: 'YYYY-MM-DD',
	sttApiUrl: 'https://api.openai.com/v1/audio/transcriptions',
	sttApiKey: '',
	sttModel: 'whisper-1',
	llmApiUrl: 'https://api.deepseek.com/v1/chat/completions',
	llmApiKey: '',
	llmModel: 'deepseek-chat',
	systemPrompt: `You are an AI assistant helping to organize voice memos into structured daily notes. Your task is to:

1. Analyze all transcribed voice recordings from today
2. Extract key information, events, tasks, and ideas
3. Organize them into a clear, structured summary

Output format:
- Use bullet points for better readability
- Group related items together
- Highlight important tasks with checkboxes [ ]
- Keep the original timestamps for reference
- Preserve the chronological order when relevant

Be concise but comprehensive. Focus on actionable items and important information.`
};

export class VocalogSettingTab extends PluginSettingTab {
	plugin: VocalogPlugin;

	constructor(app: App, plugin: VocalogPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Vocalog Settings' });

		// 基础配置
		containerEl.createEl('h3', { text: 'Basic Settings' });

		new Setting(containerEl)
			.setName('Audio folder')
			.setDesc('Folder path where audio recordings are stored')
			.addText(text => text
				.setPlaceholder('Inbox/Voice')
				.setValue(this.plugin.settings.audioFolder)
				.onChange(async (value) => {
					this.plugin.settings.audioFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Output folder')
			.setDesc('Folder where daily notes will be saved (leave empty for vault root)')
			.addText(text => text
				.setPlaceholder('Daily Notes')
				.setValue(this.plugin.settings.outputFolder)
				.onChange(async (value) => {
					this.plugin.settings.outputFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Daily note format')
			.setDesc('Date format for daily notes (using moment.js format)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dailyNoteFormat)
				.onChange(async (value) => {
					this.plugin.settings.dailyNoteFormat = value;
					await this.plugin.saveSettings();
				}));

		// STT 配置
		containerEl.createEl('h3', { text: 'Speech-to-Text (STT) Settings' });

		new Setting(containerEl)
			.setName('STT API URL')
			.setDesc('API endpoint for speech-to-text service (OpenAI Whisper compatible)')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1/audio/transcriptions')
				.setValue(this.plugin.settings.sttApiUrl)
				.onChange(async (value) => {
					this.plugin.settings.sttApiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('STT API Key')
			.setDesc('API key for authentication')
			.addText(text => {
				text.setPlaceholder('Enter your API key')
					.setValue(this.plugin.settings.sttApiKey)
					.onChange(async (value) => {
						this.plugin.settings.sttApiKey = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
			});

		new Setting(containerEl)
			.setName('STT Model')
			.setDesc('Model to use for transcription')
			.addText(text => text
				.setPlaceholder('whisper-1')
				.setValue(this.plugin.settings.sttModel)
				.onChange(async (value) => {
					this.plugin.settings.sttModel = value;
					await this.plugin.saveSettings();
				}));

		// LLM 配置
		containerEl.createEl('h3', { text: 'LLM Summarization Settings' });

		new Setting(containerEl)
			.setName('LLM API URL')
			.setDesc('API endpoint for LLM service (OpenAI Chat compatible)')
			.addText(text => text
				.setPlaceholder('https://api.deepseek.com/v1/chat/completions')
				.setValue(this.plugin.settings.llmApiUrl)
				.onChange(async (value) => {
					this.plugin.settings.llmApiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('LLM API Key')
			.setDesc('API key for authentication')
			.addText(text => {
				text.setPlaceholder('Enter your API key')
					.setValue(this.plugin.settings.llmApiKey)
					.onChange(async (value) => {
						this.plugin.settings.llmApiKey = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
			});

		new Setting(containerEl)
			.setName('LLM Model')
			.setDesc('Model to use for summarization')
			.addText(text => text
				.setPlaceholder('deepseek-chat')
				.setValue(this.plugin.settings.llmModel)
				.onChange(async (value) => {
					this.plugin.settings.llmModel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('System Prompt')
			.setDesc('Prompt to guide the AI in generating summaries')
			.addTextArea(text => {
				text.setPlaceholder('Enter system prompt')
					.setValue(this.plugin.settings.systemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 10;
				text.inputEl.cols = 50;
			});
	}
}
