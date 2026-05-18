import { createStep, createWorkflow } from '@mastra/core/workflows/vNext';
import { z } from 'zod';

import { evaluateContentWithJury, juryResultSchema } from '../../agents/Jury';

const juryWorkflowInputSchema = z.object({
  article: z.string().min(1).describe('Article or blog post to evaluate.'),
  topic: z
    .string()
    .optional()
    .describe('Optional topic for display in the final report.'),
});

const runJuryStep = createStep({
  id: 'run-jury',
  inputSchema: juryWorkflowInputSchema,
  outputSchema: juryResultSchema,
  execute: async ({ inputData }) => {
    return evaluateContentWithJury(inputData.article, inputData.topic);
  },
});

export const juryWorkflow = createWorkflow({
  id: 'jury-workflow',
  inputSchema: juryWorkflowInputSchema,
  outputSchema: juryResultSchema,
})
  .then(runJuryStep)
  .commit();
