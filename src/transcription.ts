import { TFile, Vault, moment } from 'obsidian';
import type { VocalogSettings } from './settings';

export interface TranscriptEntry {
	time: string;
	text: string;
	success: boolean;
}

/**
 * 转录单个音频文件
 * 实现文档第6.1节的 STT API 规范
 */
export async function transcribeAudio(
	audioData: ArrayBuffer,
	fileName: string,
	settings: VocalogSettings
): Promise<string> {
	const formData = new FormData();

	// 从文件名提取扩展名
	const extension = fileName.split('.').pop() || 'm4a';
	const blob = new Blob([audioData], { type: `audio/${extension}` });

	formData.append('file', blob, fileName);
	formData.append('model', settings.sttModel);

	try {
		const response = await fetch(settings.sttApiUrl, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${settings.sttApiKey}`
			},
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			throw new Error(`STT API failed: ${response.statusText} - ${errorText}`);
		}

		const result = await response.json();
		return result.text;
	} catch (error) {
		// 提供更详细的错误信息
		if (error.message.includes('Failed to fetch')) {
			throw new Error(`网络错误：无法连接到 STT API。请检查：\n1. API URL 是否正确\n2. 网络连接是否正常\n3. 是否需要代理\n原始错误: ${error.message}`);
		}
		throw error;
	}
}

/**
 * 批量转录音频文件
 * 实现文档第5节步骤1-2的转录和时间戳逻辑
 */
export async function transcribeBatch(
	files: TFile[],
	vault: Vault,
	settings: VocalogSettings,
	noticeCallback: (msg: string) => void
): Promise<TranscriptEntry[]> {
	const results: TranscriptEntry[] = [];

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		noticeCallback(`Transcribing ${i + 1}/${files.length}: ${file.name}`);

		try {
			const audioData = await vault.readBinary(file);
			const text = await transcribeAudio(audioData, file.name, settings);

			results.push({
				time: moment(file.stat.ctime).format('HH:mm'),
				text: text,
				success: true
			});
		} catch (error) {
			console.error(`Failed to transcribe ${file.name}:`, error);
			results.push({
				time: moment(file.stat.ctime).format('HH:mm'),
				text: '[Transcription Failed]',
				success: false
			});
		}
	}

	return results;
}
