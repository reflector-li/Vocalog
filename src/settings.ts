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
	systemPrompt: `你是一个极简主义的逻辑分析师。
你的任务是将用户的语音转录文本转化为**高密度、无废话**的 Markdown 日志。

### 核心原则
1. **去噪**：剔除所有重复内容和无意义的感叹。
2. **动态渲染**：**仅当**类别下有实质内容时才显示该标题。如果某个类别为空，**绝对不要**显示该标题或"无"字样。
3. **金句**：那些简单口语化的，但又深入人心的金句往往是最能阐述观点的，如果有这样的句子，请保留记录。

### 处理逻辑
请按以下逻辑处理文本，并仅输出有内容的模块：

**模块 1：📅今日所做**
*判断标准：是否可以明确看出今日所做项目，例如读了那本书的什么故事，听了什么内容的播客。*
*格式：*
- [x ] [动词] [对象]

**模块 2：💡 洞察与灵感 (Insights)**
*判断标准：是否存在独特的观点、反思、决策或灵感？*
*格式：*
- **关键词**：一句话核心观点，关键词是总结凝练的结果。

**模块 3：✅ 待办事项 (Actions)**
*判断标准：是否存在明确的任务、下一步行动或需要跟进的事项？*
*格式：*
- [ ] [动词] [对象]

### 示例
输入："记得买牛奶。"
输出：
## ✅ 待办事项
- [ ] 购买牛奶

(注意：不要输出空的"今日所做"，"洞察"和"记录"模块)`
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

		new Setting(containerEl)
			.setHeading()
			.setName('Vocalog settings');

		// 基础配置
		new Setting(containerEl)
			.setHeading()
			.setName('Basic settings');

		new Setting(containerEl)
			.setName('Audio folder')
			.setDesc('Folder path where audio recordings are stored')
			.addText(text => text
				.setPlaceholder('Path')
				.setValue(this.plugin.settings.audioFolder)
				.onChange(async (value) => {
					this.plugin.settings.audioFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Output folder')
			.setDesc('Folder where daily notes will be saved (leave empty for vault root)')
			.addText(text => text
				.setPlaceholder('Folder')
				.setValue(this.plugin.settings.outputFolder)
				.onChange(async (value) => {
					this.plugin.settings.outputFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Daily note format')
			.setDesc('Date format for daily notes (using moment.js format)')
			.addText(text => text
				.setPlaceholder('Format')
				.setValue(this.plugin.settings.dailyNoteFormat)
				.onChange(async (value) => {
					this.plugin.settings.dailyNoteFormat = value;
					await this.plugin.saveSettings();
				}));

		// STT 配置
		new Setting(containerEl)
			.setHeading()
			.setName('Speech-to-text settings');

		new Setting(containerEl)
			.setName('Speech-to-text API URL')
			.setDesc('API endpoint for speech-to-text service')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1/audio/transcriptions')
				.setValue(this.plugin.settings.sttApiUrl)
				.onChange(async (value) => {
					this.plugin.settings.sttApiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Speech-to-text API key')
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
			.setName('Speech-to-text model')
			.setDesc('Model to use for transcription')
			.addText(text => text
				.setPlaceholder('Model')
				.setValue(this.plugin.settings.sttModel)
				.onChange(async (value) => {
					this.plugin.settings.sttModel = value;
					await this.plugin.saveSettings();
				}));

		// LLM 配置
		new Setting(containerEl)
			.setHeading()
			.setName('AI summarization settings');

		new Setting(containerEl)
			.setName('AI API URL')
			.setDesc('API endpoint for AI service')
			.addText(text => text
				.setPlaceholder('https://api.deepseek.com/v1/chat/completions')
				.setValue(this.plugin.settings.llmApiUrl)
				.onChange(async (value) => {
					this.plugin.settings.llmApiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('AI API key')
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
			.setName('AI model')
			.setDesc('Model to use for summarization')
			.addText(text => text
				.setPlaceholder('Model')
				.setValue(this.plugin.settings.llmModel)
				.onChange(async (value) => {
					this.plugin.settings.llmModel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('System prompt')
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
