import { createStep, createWorkflow } from '@mastra/core/workflows/vNext';
import { z } from 'zod';

import { generateArticle } from '../../agents/ContentWriter';
import { evaluateContentWithJury, juryResultSchema } from '../../agents/Jury';

const contentJuryInputSchema = z.object({
  topic: z.string().min(1).describe('Topic to write about and evaluate.'),
});

const writeArticleStep = createStep({
  id: 'write-article',
  inputSchema: contentJuryInputSchema,
  outputSchema: z.object({
    topic: z.string(),
    article: z.string(),
  }),
  execute: async ({ inputData }) => {
    const article = await generateArticle(inputData.topic);

    return {
      topic: inputData.topic,
      article,
    };
  },
});

const evaluateArticleStep = createStep({
  id: 'evaluate-article',
  inputSchema: z.object({
    topic: z.string(),
    article: z.string(),
  }),
  outputSchema: juryResultSchema,
  execute: async ({ inputData }) => {
    return evaluateContentWithJury(inputData.article, inputData.topic);
  },
});

export const contentJuryWorkflow = createWorkflow({
  id: 'content-jury-workflow',
  inputSchema: contentJuryInputSchema,
  outputSchema: juryResultSchema,
})
  .then(writeArticleStep)
  .then(evaluateArticleStep)
  .commit();
