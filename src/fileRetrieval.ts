import { TFile, Vault, moment } from 'obsidian';

/**
 * 获取今日的音频文件
 * 实现文档第4节的三重过滤逻辑
 */
export function getTodayAudioFiles(
	vault: Vault,
	audioFolder: string
): TFile[] {
	const todayStart = moment().startOf('day');
	const todayEnd = moment().endOf('day');
	return getAudioFilesByDateRange(vault, audioFolder, todayStart, todayEnd);
}

/**
 * 获取指定日期范围的音频文件
 */
export function getAudioFilesByDateRange(
	vault: Vault,
	audioFolder: string,
	startDate: moment.Moment,
	endDate: moment.Moment
): TFile[] {
	// 1. 获取所有文件
	const allFiles = vault.getFiles();

	// 2. 三重过滤
	const audioFiles = allFiles.filter(file => {
		// 条件1: 路径匹配
		const isInFolder = file.path.startsWith(audioFolder);

		// 条件2: 扩展名匹配
		const validExtensions = ['mp3', 'm4a', 'wav', 'webm', 'ogg'];
		const ext = file.extension.toLowerCase();
		const isValidExtension = validExtensions.includes(ext);

		// 条件3: 日期匹配（使用 ctime）
		const fileTime = moment(file.stat.ctime);
		const isInRange = fileTime.isBetween(startDate, endDate, null, '[]');

		return isInFolder && isValidExtension && isInRange;
	});

	// 3. 按创建时间升序排序
	audioFiles.sort((a, b) => a.stat.ctime - b.stat.ctime);

	return audioFiles;
}

/**
 * 获取指定日期的音频文件
 */
export function getAudioFilesByDate(
	vault: Vault,
	audioFolder: string,
	date: moment.Moment
): TFile[] {
	const dayStart = date.clone().startOf('day');
	const dayEnd = date.clone().endOf('day');
	return getAudioFilesByDateRange(vault, audioFolder, dayStart, dayEnd);
}
