import { requestUrl } from 'obsidian';
import type { VocalogSettings } from './settings';
import type { TranscriptEntry } from './transcription';

interface ChatMessage {
	role: 'system' | 'user';
	content: string;
}

interface ChatRequestBody {
	model: string;
	messages: ChatMessage[];
	temperature: number;
}

interface ChatChoice {
	message: {
		content: string;
	};
}

interface ChatResponse {
	choices: ChatChoice[];
}

/**
 * 使用 LLM 总结转录文本
 * 实现文档第6.2节的 LLM API 规范
 */
export async function summarizeTranscripts(
	transcripts: TranscriptEntry[],
	settings: VocalogSettings
): Promise<string> {
	// 构建上下文 C（文档第5节步骤2）
	const context = transcripts
		.map(t => `[${t.time}] ${t.text}`)
		.join('\n\n');

	// 构建 API 请求
	const requestBody: ChatRequestBody = {
		model: settings.llmModel,
		messages: [
			{ role: 'system', content: settings.systemPrompt },
			{ role: 'user', content: context }
		],
		temperature: 0.7
	};

	try {
		const response = await requestUrl({
			url: settings.llmApiUrl,
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${settings.llmApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		const result = response.json as ChatResponse;
		return result.choices[0]?.message?.content ?? '';
	} catch (error) {
		// 提供更详细的错误信息
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
			throw new Error(`网络错误：无法连接到 LLM API。请检查：\n1. API URL 是否正确\n2. API Key 是否有效\n3. 网络连接是否正常\n原始错误: ${errorMessage}`);
		}
		throw error;
	}
}
