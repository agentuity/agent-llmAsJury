import Anthropic from '@anthropic-ai/sdk';
import { createOpenAI } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';

const openai = createOpenAI();

export const evaluationSchema = z.object({
  clarity: z
    .number()
    .min(0)
    .max(10)
    .describe(
      'Score for clarity from 1 to 10. Use 0 only when a judge is unavailable.'
    ),
  structure: z
    .number()
    .min(0)
    .max(10)
    .describe(
      'Score for structure from 1 to 10. Use 0 only when a judge is unavailable.'
    ),
  engagement: z
    .number()
    .min(0)
    .max(10)
    .describe(
      'Score for engagement from 1 to 10. Use 0 only when a judge is unavailable.'
    ),
  technical: z
    .number()
    .min(0)
    .max(10)
    .describe(
      'Score for technical accuracy from 1 to 10. Use 0 only when a judge is unavailable.'
    ),
  overall: z
    .number()
    .min(0)
    .max(10)
    .describe(
      'Overall score from 1 to 10. Use 0 only when a judge is unavailable.'
    ),
  explanation: z.string().describe('Detailed explanation of the evaluation.'),
});

export const modelEvaluationSchema = z.object({
  name: z.string(),
  evaluation: evaluationSchema,
});

export const juryConsensusSchema = z.object({
  clarity: z.number().min(0).max(10),
  structure: z.number().min(0).max(10),
  engagement: z.number().min(0).max(10),
  technical: z.number().min(0).max(10),
  overall: z.number().min(0).max(10),
});

export const juryResultSchema = z.object({
  article: z.string(),
  topic: z.string().optional(),
  overallScore: z.number().min(0).max(10),
  consensus: juryConsensusSchema,
  modelEvaluations: z.array(modelEvaluationSchema),
  formattedReport: z.string(),
});

export type EvaluationResult = z.infer<typeof evaluationSchema>;
export type ModelEvaluation = z.infer<typeof modelEvaluationSchema>;
export type JuryResult = z.infer<typeof juryResultSchema>;

export const balancedJudgeAgent = new Agent({
  name: 'Balanced Judge',
  instructions:
    'You are a precise, fair evaluator of written content. Score carefully and explain the reasoning behind each score.',
  model: openai('gpt-4o-mini'),
});

export const strictJudgeAgent = new Agent({
  name: 'Strict Judge',
  instructions:
    'You are a critical evaluator of written content who pays close attention to technical quality, structure, and weak reasoning.',
  model: openai('gpt-4o'),
});

function buildEvaluationPrompt(article: string) {
  return [
    'Evaluate the following content on a scale of 1-10 for these criteria:',
    '- Clarity: How clear and understandable is the content?',
    '- Structure: How well-organized is the content?',
    '- Engagement: How engaging and interesting is the content?',
    '- Technical accuracy: How factually accurate is the content?',
    '',
    'Provide an overall score that reflects the full piece.',
    '',
    'For the explanation, use this exact format:',
    'Clarity: [Brief 1-2 sentence explanation of the clarity score]',
    '',
    'Structure: [Brief 1-2 sentence explanation of the structure score]',
    '',
    'Engagement: [Brief 1-2 sentence explanation of the engagement score]',
    '',
    'Technical Accuracy: [Brief 1-2 sentence explanation of the technical score]',
    '',
    'Overall: [Brief summary of the overall assessment]',
    '',
    'Content to evaluate:',
    article,
  ].join('\n');
}

function averageScore(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(value: unknown) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(10, Math.max(0, numericValue));
}

function normalizeExplanation(value: unknown) {
  const explanation = String(value || '').trim();

  if (explanation.length === 0) {
    return 'No explanation was returned.';
  }

  if (explanation.length > 2000) {
    return `${explanation.slice(0, 2000)}...`;
  }

  return explanation;
}

function normalizeEvaluation(value: Record<string, unknown>): EvaluationResult {
  return {
    clarity: clampScore(value.clarity),
    structure: clampScore(value.structure),
    engagement: clampScore(value.engagement),
    technical: clampScore(value.technical),
    overall: clampScore(value.overall),
    explanation: normalizeExplanation(value.explanation),
  };
}

function buildUnavailableEvaluation(message: string): EvaluationResult {
  return {
    clarity: 0,
    structure: 0,
    engagement: 0,
    technical: 0,
    overall: 0,
    explanation: message,
  };
}

async function runClaudeJudge(
  evaluationPrompt: string
): Promise<ModelEvaluation> {
  const anthropicClient = new Anthropic();

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system:
        'You are a critical evaluator of written content. Respond with only valid JSON matching the requested schema.',
      messages: [
        {
          role: 'user',
          content: `${evaluationPrompt}\n\nIMPORTANT: Respond with only valid JSON and no markdown.`,
        },
      ],
    });

    const firstBlock = response.content[0];
    const text =
      firstBlock &&
      typeof firstBlock === 'object' &&
      'type' in firstBlock &&
      firstBlock.type === 'text'
        ? String(firstBlock.text || '')
        : '';

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const jsonString =
      jsonStart !== -1 && jsonEnd !== -1
        ? text.slice(jsonStart, jsonEnd + 1)
        : text.trim();

    const parsed = JSON.parse(jsonString) as Record<string, unknown>;

    return {
      name: 'Claude (Anthropic)',
      evaluation: normalizeEvaluation(parsed),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Claude evaluation failed.';

    return {
      name: 'Claude (Anthropic)',
      evaluation: buildUnavailableEvaluation(message),
    };
  }
}

export function formatJuryReport(result: Omit<JuryResult, 'formattedReport'>) {
  const lines: string[] = [
    'ARTICLE TO EVALUATE',
    '-------------------',
    '',
    result.article,
    '',
    'MULTI-MODEL AI JURY EVALUATION',
    '-------------------------------',
    '',
  ];

  if (result.topic) {
    lines.push(`Topic: ${result.topic}`, '');
  }

  lines.push(
    `Overall Consensus Score: ${result.overallScore.toFixed(1)}/10`,
    ''
  );

  result.modelEvaluations.forEach((model, index) => {
    lines.push(`${index + 1}. ${model.name.toUpperCase()}`);
    lines.push('-'.repeat(model.name.length + 3));
    lines.push('');

    if (model.evaluation.overall === 0) {
      lines.push(model.evaluation.explanation, '');
      return;
    }

    lines.push(
      'Scores:',
      `  Clarity: ${model.evaluation.clarity.toFixed(1)}/10`,
      `  Structure: ${model.evaluation.structure.toFixed(1)}/10`,
      `  Engagement: ${model.evaluation.engagement.toFixed(1)}/10`,
      `  Technical: ${model.evaluation.technical.toFixed(1)}/10`,
      `  Overall: ${model.evaluation.overall.toFixed(1)}/10`,
      '',
      model.evaluation.explanation,
      ''
    );
  });

  lines.push(
    'CONSENSUS SUMMARY',
    '-----------------',
    '',
    `  Clarity:      ${result.consensus.clarity.toFixed(1)}/10`,
    `  Structure:    ${result.consensus.structure.toFixed(1)}/10`,
    `  Engagement:   ${result.consensus.engagement.toFixed(1)}/10`,
    `  Technical:    ${result.consensus.technical.toFixed(1)}/10`,
    `  Overall Avg:  ${result.overallScore.toFixed(1)}/10`
  );

  return lines.join('\n');
}

export async function evaluateContentWithJury(
  article: string,
  topic?: string
): Promise<JuryResult> {
  const evaluationPrompt = buildEvaluationPrompt(article);

  const [balancedResult, strictResult, claudeResult] = await Promise.all([
    balancedJudgeAgent.generate(evaluationPrompt, { output: evaluationSchema }),
    strictJudgeAgent.generate(evaluationPrompt, { output: evaluationSchema }),
    runClaudeJudge(evaluationPrompt),
  ]);

  const modelEvaluations: ModelEvaluation[] = [
    {
      name: 'Balanced Judge (GPT-4o Mini)',
      evaluation: normalizeEvaluation(
        balancedResult.object as Record<string, unknown>
      ),
    },
    {
      name: 'Strict Judge (GPT-4o)',
      evaluation: normalizeEvaluation(
        strictResult.object as Record<string, unknown>
      ),
    },
    claudeResult,
  ];

  const validEvaluations = modelEvaluations
    .map((model) => model.evaluation)
    .filter((evaluation) => evaluation.overall > 0);

  const consensus = {
    clarity: averageScore(
      validEvaluations.map((evaluation) => evaluation.clarity)
    ),
    structure: averageScore(
      validEvaluations.map((evaluation) => evaluation.structure)
    ),
    engagement: averageScore(
      validEvaluations.map((evaluation) => evaluation.engagement)
    ),
    technical: averageScore(
      validEvaluations.map((evaluation) => evaluation.technical)
    ),
    overall: averageScore(
      validEvaluations.map((evaluation) => evaluation.overall)
    ),
  };

  const result = {
    article,
    topic,
    overallScore: consensus.overall,
    consensus,
    modelEvaluations,
  };

  return {
    ...result,
    formattedReport: formatJuryReport(result),
  };
}
