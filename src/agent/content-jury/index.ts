import { createAgent } from '@agentuity/runtime';
import { s } from '@agentuity/schema';

import { generateArticle } from '../../agents/ContentWriter';
import { evaluateContentWithJury } from '../../agents/Jury';

const evaluationSchema = s.object({
  clarity: s.number().min(0).max(10),
  structure: s.number().min(0).max(10),
  engagement: s.number().min(0).max(10),
  technical: s.number().min(0).max(10),
  overall: s.number().min(0).max(10),
  explanation: s.string(),
});

const juryResultSchema = s.object({
  article: s.string(),
  topic: s.optional(s.string()),
  overallScore: s.number().min(0).max(10),
  consensus: s.object({
    clarity: s.number().min(0).max(10),
    structure: s.number().min(0).max(10),
    engagement: s.number().min(0).max(10),
    technical: s.number().min(0).max(10),
    overall: s.number().min(0).max(10),
  }),
  modelEvaluations: s.array(
    s.object({
      name: s.string(),
      evaluation: evaluationSchema,
    })
  ),
  formattedReport: s.string(),
});

const ContentJuryInputSchema = s.object({
  topic: s.string().min(1).describe('Topic to write about and evaluate.'),
});

const contentJuryAgent = createAgent('content-jury', {
  description:
    'Writes an article for a topic and then evaluates it with the jury.',
  schema: {
    input: ContentJuryInputSchema,
    output: juryResultSchema,
  },
  handler: async (ctx, input) => {
    ctx.logger.info('Generating article before jury evaluation', {
      topic: input.topic,
    });

    const article = await generateArticle(input.topic);

    return evaluateContentWithJury(article, input.topic);
  },
});

export const welcome = () => ({
  welcome:
    'Give me a topic and I will write an article, then run the multi-model jury against it.',
  prompts: [
    {
      data: JSON.stringify({
        topic: 'developer productivity',
      }),
      contentType: 'application/json',
    },
  ],
});

export default contentJuryAgent;
