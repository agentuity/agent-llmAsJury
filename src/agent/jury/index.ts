import { createAgent } from '@agentuity/runtime';
import { s } from '@agentuity/schema';

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

const JuryInputSchema = s.object({
  article: s.string().min(1).describe('Article or blog post to evaluate.'),
  topic: s.optional(
    s.string().describe('Optional topic label for the report.')
  ),
});

const juryAgent = createAgent('jury', {
  description: 'Evaluates submitted content with a multi-model AI jury.',
  schema: {
    input: JuryInputSchema,
    output: juryResultSchema,
  },
  handler: async (ctx, input) => {
    ctx.logger.info('Running jury evaluation', {
      topic: input.topic,
      articleLength: input.article.length,
    });

    return evaluateContentWithJury(input.article, input.topic);
  },
});

export const welcome = () => ({
  welcome:
    'Paste an article or blog post and the jury will score it across clarity, structure, engagement, and technical accuracy.',
  prompts: [
    {
      data: JSON.stringify({
        article:
          'AI coding assistants are changing how developers work by handling repetitive tasks, suggesting fixes, and accelerating prototyping.',
        topic: 'AI coding assistants',
      }),
      contentType: 'application/json',
    },
  ],
});

export default juryAgent;
