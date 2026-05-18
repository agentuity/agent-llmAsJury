import { createOpenAI } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

const openai = createOpenAI();

export const contentWriterAgent = new Agent({
  name: 'Content Writer',
  instructions:
    'You are an expert blog writer who creates clear, engaging, well-structured articles. Write with a confident, readable tone and use concrete examples when helpful.',
  model: openai('gpt-4o-mini'),
});

export function buildArticlePrompt(topic: string) {
  return [
    `Write a comprehensive blog post about "${topic}".`,
    'The article should include:',
    '- An engaging title',
    '- A concise introduction',
    '- 3 to 5 sections with clear subheadings',
    '- A strong conclusion',
    'Keep it informative, engaging, and roughly 500 to 800 words.',
  ].join('\n');
}

export async function generateArticle(topic: string) {
  const response = await contentWriterAgent.generate(buildArticlePrompt(topic));
  return response.text;
}
