import { buildArticlePrompt } from './src/agents/ContentWriter';
import { mastra } from './src/mastra';

function usage() {
  console.error('Usage:');
  console.error('  bun run index.ts write <topic>');
  console.error('  bun run index.ts evaluate <article text>');
  console.error('  bun run index.ts workflow <topic>');
}

function assertSuccess<T extends { status: string }>(
  label: string,
  result: T
): Extract<T, { status: 'success' }> {
  if (result.status === 'success') {
    return result as Extract<T, { status: 'success' }>;
  }

  if (result.status === 'failed' && 'error' in result) {
    throw result.error;
  }

  throw new Error(`${label} finished with status ${result.status}.`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const input = args.join(' ').trim();

  if (!command || !input) {
    usage();
    process.exit(1);
  }

  if (command === 'write') {
    const agent = mastra.getAgent('contentWriterAgent');
    const response = await agent.generate(buildArticlePrompt(input));
    console.log(response.text);
    return;
  }

  if (command === 'evaluate') {
    const workflow = mastra.vnext_getWorkflow('juryWorkflow');
    const run = await workflow.createRun();
    const result = assertSuccess(
      'jury workflow',
      await run.start({ inputData: { article: input } })
    );

    console.log(result.result.formattedReport);
    return;
  }

  if (command === 'workflow') {
    const workflow = mastra.vnext_getWorkflow('contentJuryWorkflow');
    const run = await workflow.createRun();
    const result = assertSuccess(
      'content jury workflow',
      await run.start({ inputData: { topic: input } })
    );

    console.log(result.result.formattedReport);
    return;
  }

  usage();
  process.exit(1);
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }

  process.exit(1);
});
