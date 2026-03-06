import { Plugin, Notice, TFile, Menu, moment } from 'obsidian';
import { VocalogSettingTab, DEFAULT_SETTINGS, VocalogSettings } from './settings';
import { getTodayAudioFiles, getAudioFilesByDate } from './fileRetrieval';
import { transcribeBatch } from './transcription';
import { summarizeTranscripts } from './summarization';
import { writeToJournal } from './journalWriter';
import { CalendarModal } from './calendarModal';

export default class VocalogPlugin extends Plugin {
	settings: VocalogSettings;

	async onload() {
		// 加载设置
		await this.loadSettings();

		// 添加设置页面
		this.addSettingTab(new VocalogSettingTab(this.app, this));

		// 添加 Ribbon 图标按钮（左侧边栏）
		this.addRibbonIcon('microphone', 'Vocalog: generate audio notes', async (evt: MouseEvent) => {
			await this.generateAudioNotes();
		});

		// 注册命令：处理今日音频
		this.addCommand({
			id: 'generate-audio-notes',
			name: 'Generate audio notes',
			callback: () => void this.generateAudioNotes()
		});

		// 注册命令：处理选中的音频文件
		this.addCommand({
			id: 'generate-from-selected',
			name: 'Generate from selected audio files',
			checkCallback: (checking: boolean) => {
				const files = this.getSelectedAudioFiles();
				if (files.length > 0) {
					if (!checking) {
						void this.generateFromFiles(files);
					}
					return true;
				}
				return false;
			}
		});

		// 注册命令：按日期范围处理（使用日历组件）
		this.addCommand({
			id: 'generate-by-date-range',
			name: 'Generate audio notes by date range',
			callback: () => {
				new CalendarModal(this.app, (dates) => {
					void this.generateBySelectedDates(dates);
				}).open();
			}
		});

		// 添加文件菜单项（右键菜单）
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file: TFile) => {
				if (this.isAudioFile(file)) {
					menu.addItem((item) => {
						item
							.setTitle('Generate audio note')
							.setIcon('microphone')
							.onClick(async () => {
								await this.generateFromFiles([file]);
							});
					});
				}
			})
		);
	}

	async generateAudioNotes() {
		const notice = new Notice('Starting vocalog processing...', 0);

		try {
			// 步骤1: 文件检索（文档第4节）
			const files = getTodayAudioFiles(this.app.vault, this.settings.audioFolder);

			// 错误处理：无文件（文档第8节）
			if (files.length === 0) {
				notice.hide();
				new Notice('No audio recordings found for today.');
				return;
			}

			await this.processAudioFiles(files, notice);

		} catch (error) {
			notice.hide();
			console.error('Vocalog processing failed:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			new Notice(`Error: ${errorMessage}`);
		}
	}

	async generateFromFiles(files: TFile[], targetDate?: moment.Moment) {
		const notice = new Notice('Processing selected audio files...', 0);

		try {
			if (files.length === 0) {
				notice.hide();
				new Notice('No audio files selected.');
				return;
			}

			// 按创建时间排序
			files.sort((a, b) => a.stat.ctime - b.stat.ctime);

			await this.processAudioFiles(files, notice, targetDate);

		} catch (error) {
			notice.hide();
			console.error('Audio processing failed:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			new Notice(`❌ Error: ${errorMessage}`);
		}
	}

	async generateBySelectedDates(dates: moment.Moment[]) {
		const notice = new Notice('Processing audio files for selected dates...', 0);

		try {
			if (dates.length === 0) {
				notice.hide();
				new Notice('No dates selected.');
				return;
			}

			let totalProcessed = 0;

			for (const date of dates) {
				const files = getAudioFilesByDate(this.app.vault, this.settings.audioFolder, date);

				if (files.length > 0) {
					notice.setMessage(`Processing ${date.format('YYYY-MM-DD')} (${files.length} files)...`);
					await this.processAudioFiles(files, notice, date);
					totalProcessed += files.length;
				}
			}

			notice.hide();
			if (totalProcessed === 0) {
				new Notice(`No audio recordings found for selected dates.`);
			} else {
				new Notice(`✅ Processed ${totalProcessed} audio files from ${dates.length} day(s)!`);
			}

		} catch (error) {
			notice.hide();
			console.error('Selected dates processing failed:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			new Notice(`❌ Error: ${errorMessage}`);
		}
	}

	async generateByDateRange(startDate: moment.Moment, endDate: moment.Moment) {
		const notice = new Notice('Processing audio files by date range...', 0);

		try {
			// 如果是单日，使用单日方法
			if (startDate.isSame(endDate, 'day')) {
				const files = getAudioFilesByDate(this.app.vault, this.settings.audioFolder, startDate);

				if (files.length === 0) {
					notice.hide();
					new Notice(`No audio recordings found for ${startDate.format('YYYY-MM-DD')}.`);
					return;
				}

				await this.processAudioFiles(files, notice, startDate);
			} else {
				// 多日范围：按日期分组处理
				const daysDiff = endDate.diff(startDate, 'days') + 1;
				let totalProcessed = 0;

				for (let i = 0; i < daysDiff; i++) {
					const currentDate = startDate.clone().add(i, 'days');
					const files = getAudioFilesByDate(this.app.vault, this.settings.audioFolder, currentDate);

					if (files.length > 0) {
						notice.setMessage(`Processing ${currentDate.format('YYYY-MM-DD')} (${files.length} files)...`);
						await this.processAudioFiles(files, notice, currentDate);
						totalProcessed += files.length;
					}
				}

				notice.hide();
				if (totalProcessed === 0) {
					new Notice(`No audio recordings found in date range.`);
				} else {
					new Notice(`✅ Processed ${totalProcessed} audio files from ${daysDiff} days!`);
				}
				return;
			}

		} catch (error) {
			notice.hide();
			console.error('Date range processing failed:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			new Notice(`❌ Error: ${errorMessage}`);
		}
	}

	async processAudioFiles(files: TFile[], notice: Notice, targetDate?: moment.Moment) {
		notice.setMessage(`Found ${files.length} audio files. Transcribing...`);

		// 步骤2: 批量转录（文档第5节步骤1）
		const transcripts = await transcribeBatch(
			files,
			this.app.vault,
			this.settings,
			(msg) => notice.setMessage(msg)
		);

		// 步骤3: LLM 总结（文档第5节步骤3）
		notice.setMessage('Generating summary with AI...');
		let finalContent: string;

		try {
			finalContent = await summarizeTranscripts(transcripts, this.settings);
		} catch (error) {
			// 错误处理：备份原始文本（文档第8节）
			console.error('LLM summarization failed:', error);
			finalContent = transcripts
				.map(t => `[${t.time}] ${t.text}`)
				.join('\n\n');
			finalContent = '⚠️ AI Summary Failed - Raw Transcripts:\n\n' + finalContent;
		}

		// 添加音频源文件链接
		const audioLinks = this.generateAudioLinks(files);
		if (audioLinks) {
			finalContent += '\n\n---\n\n' + audioLinks;
		}

		// 步骤4: 写入日记（文档第5节步骤4）
		notice.setMessage('Writing to daily note...');
		await writeToJournal(finalContent, this.settings, this.app.vault, targetDate);

		notice.hide();
		new Notice('Vocalog generated successfully!');
	}

	generateAudioLinks(files: TFile[]): string {
		if (files.length === 0) return '';

		const links = files.map(file => {
			// 使用 ! 让 Obsidian 直接渲染音频播放器
			const linkText = `![[${file.path}]]`;
			return `${linkText}`;
		});

		return `### Audio sources\n\n${links.join('\n\n')}`;
	}

	isAudioFile(file: TFile): boolean {
		const validExtensions = ['mp3', 'm4a', 'wav', 'webm', 'ogg'];
		return validExtensions.includes(file.extension.toLowerCase());
	}

	getSelectedAudioFiles(): TFile[] {
		// 获取当前活动的文件浏览器选中的文件
		const files: TFile[] = [];

		// 尝试从文件浏览器获取选中的文件
		const fileExplorers = this.app.workspace.getLeavesOfType('file-explorer');
		if (fileExplorers.length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing internal Obsidian API for file explorer selection
			const fileExplorer: any = fileExplorers[0].view;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Accessing internal Obsidian API tree property
			if (fileExplorer?.tree) {
				// 获取所有选中的文件
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Accessing internal Obsidian API selectedDoms property
				const selectedItems = fileExplorer.tree.selectedDoms;
				if (selectedItems) {
					for (const item of selectedItems) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Accessing internal Obsidian API file property
						const file = item.file as TFile | undefined;
						if (file && this.isAudioFile(file)) {
							files.push(file);
						}
					}
				}
			}
		}

		return files;
	}

	async loadSettings() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Object.assign returns mixed type for plugin settings
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
