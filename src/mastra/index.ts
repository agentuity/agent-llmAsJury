import { Mastra } from '@mastra/core/mastra';

import { contentWriterAgent } from '../agents/ContentWriter';
import { balancedJudgeAgent, strictJudgeAgent } from '../agents/Jury';
import { contentJuryWorkflow } from './workflows/content-jury-workflow';
import { juryWorkflow } from './workflows/jury-workflow';

export const mastra = new Mastra({
  agents: {
    contentWriterAgent,
    balancedJudgeAgent,
    strictJudgeAgent,
  },
  vnext_workflows: {
    juryWorkflow,
    contentJuryWorkflow,
  },
});
