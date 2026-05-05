import { TFile, Vault, moment, requestUrl } from 'obsidian';
import type { VocalogSettings } from './settings';

export interface TranscriptEntry {
	time: string;
	text: string;
	success: boolean;
}

interface TranscribeResponse {
	text: string;
}

function encodeUtf8(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
	const totalLength = parts.reduce((length, part) => length + part.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;

	for (const part of parts) {
		result.set(part, offset);
		offset += part.length;
	}

	return result;
}

function buildMultipartBody(audioData: ArrayBuffer, fileName: string, model: string): { body: ArrayBuffer; boundary: string } {
	const boundary = `----VocalogFormBoundary${Date.now().toString(16)}`;
	const audioBytes = new Uint8Array(audioData);
	const parts = [
		encodeUtf8(
			`--${boundary}\r\n` +
			`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
			`Content-Type: application/octet-stream\r\n\r\n`
		),
		audioBytes,
		encodeUtf8(
			`\r\n--${boundary}\r\n` +
			`Content-Disposition: form-data; name="model"\r\n\r\n` +
			`${model}\r\n` +
			`--${boundary}--\r\n`
		),
	];
	const bytes = concatUint8Arrays(parts);
	const body = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(body).set(bytes);

	return {
		body,
		boundary,
	};
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
	const multipart = buildMultipartBody(audioData, fileName, settings.sttModel);

	try {
		const response = await requestUrl({
			url: settings.sttApiUrl,
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${settings.sttApiKey}`,
				'Content-Type': `multipart/form-data; boundary=${multipart.boundary}`,
			},
			body: multipart.body,
			throw: false,
		});

		if (response.status < 200 || response.status >= 300) {
			throw new Error(`STT API failed: ${response.status} - ${response.text || 'Unknown error'}`);
		}

		const result = response.json as TranscribeResponse;
		return result.text;
	} catch (error) {
		// 提供更详细的错误信息
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
			throw new Error(`网络错误：无法连接到 STT API。请检查：\n1. API URL 是否正确\n2. 网络连接是否正常\n3. 是否需要代理\n原始错误: ${errorMessage}`);
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
