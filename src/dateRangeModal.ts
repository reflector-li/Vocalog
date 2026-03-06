import { App, Modal, Setting, moment } from 'obsidian';

export class DateRangeModal extends Modal {
	startDate: string;
	endDate: string;
	onSubmit: (startDate: moment.Moment, endDate: moment.Moment) => void;

	constructor(app: App, onSubmit: (startDate: moment.Moment, endDate: moment.Moment) => void) {
		super(app);
		this.onSubmit = onSubmit;

		// 默认值：今天
		this.startDate = moment().format('YYYY-MM-DD');
		this.endDate = moment().format('YYYY-MM-DD');
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Select date range' });

		// 开始日期
		new Setting(contentEl)
			.setName('Start date')
			.setDesc('Select the start date')
			.addText(text => text
				.setPlaceholder('Date')
				.setValue(this.startDate)
				.onChange(value => {
					this.startDate = value;
				}));

		// 结束日期
		new Setting(contentEl)
			.setName('End date')
			.setDesc('Select the end date')
			.addText(text => text
				.setPlaceholder('Date')
				.setValue(this.endDate)
				.onChange(value => {
					this.endDate = value;
				}));

		// 快捷选项
		contentEl.createEl('h3', { text: 'Quick options' });

		const buttonContainer = contentEl.createDiv({ cls: 'date-quick-options' });

		// 今天
		const todayBtn = buttonContainer.createEl('button', { text: 'Today' });
		todayBtn.onclick = () => {
			const today = moment().format('YYYY-MM-DD');
			this.startDate = today;
			this.endDate = today;
			this.close();
			this.submit();
		};

		// 昨天
		const yesterdayBtn = buttonContainer.createEl('button', { text: 'Yesterday' });
		yesterdayBtn.onclick = () => {
			const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
			this.startDate = yesterday;
			this.endDate = yesterday;
			this.close();
			this.submit();
		};

		// 最近7天
		const last7DaysBtn = buttonContainer.createEl('button', { text: 'Last 7 days' });
		last7DaysBtn.onclick = () => {
			this.startDate = moment().subtract(6, 'days').format('YYYY-MM-DD');
			this.endDate = moment().format('YYYY-MM-DD');
			this.close();
			this.submit();
		};

		// 本周
		const thisWeekBtn = buttonContainer.createEl('button', { text: 'This week' });
		thisWeekBtn.onclick = () => {
			this.startDate = moment().startOf('week').format('YYYY-MM-DD');
			this.endDate = moment().endOf('week').format('YYYY-MM-DD');
			this.close();
			this.submit();
		};

		// 上周
		const lastWeekBtn = buttonContainer.createEl('button', { text: 'Last week' });
		lastWeekBtn.onclick = () => {
			this.startDate = moment().subtract(1, 'week').startOf('week').format('YYYY-MM-DD');
			this.endDate = moment().subtract(1, 'week').endOf('week').format('YYYY-MM-DD');
			this.close();
			this.submit();
		};

		// 本月
		const thisMonthBtn = buttonContainer.createEl('button', { text: 'This month' });
		thisMonthBtn.onclick = () => {
			this.startDate = moment().startOf('month').format('YYYY-MM-DD');
			this.endDate = moment().endOf('month').format('YYYY-MM-DD');
			this.close();
			this.submit();
		};

		// 提交按钮
		const submitContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const submitBtn = submitContainer.createEl('button', {
			text: 'Generate notes',
			cls: 'mod-cta'
		});
		submitBtn.onclick = () => {
			this.close();
			this.submit();
		};

		const cancelBtn = submitContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.onclick = () => {
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	submit() {
		const start = moment(this.startDate, 'YYYY-MM-DD');
		const end = moment(this.endDate, 'YYYY-MM-DD');

		if (!start.isValid() || !end.isValid()) {
			// 显示错误
			return;
		}

		if (start.isAfter(end)) {
			// 交换日期
			this.onSubmit(end, start);
		} else {
			this.onSubmit(start, end);
		}
	}
}
