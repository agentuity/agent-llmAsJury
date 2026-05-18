# LLM as Jury with Mastra and Agentuity

A Mastra-powered LLM-as-jury example wrapped in the Agentuity runtime.

Use this project through **Agentuity** when you want the Agentuity AI Gateway, Workbench, and observability. Mastra still owns the core agent and workflow logic; Agentuity is the runtime wrapper around it.

## What is included

- `Content Writer` Mastra agent using `gpt-4o-mini`
- `Balanced Judge` Mastra agent using `gpt-4o-mini`
- `Strict Judge` Mastra agent using `gpt-4o`
- Claude judge through the Anthropic SDK
- `juryWorkflow` for evaluating pasted content
- `contentJuryWorkflow` for generating and evaluating an article
- Agentuity agent wrappers for Workbench/API execution
- API routes for `/api/jury` and `/api/content-jury`

## Project structure

```text
app.ts                     Agentuity runtime entrypoint
agentuity.config.ts        Agentuity Workbench config
src/
├── agent/                 Agentuity agent wrappers
├── agents/                Core Mastra agents
├── api/                   Agentuity API routes
└── mastra/
    ├── index.ts           Mastra instance
    ├── storage.ts         LibSQL warning patch for Mastra 0.9.x
    └── workflows/         Mastra workflows
```

## Setup

```bash
bun install
agentuity login
```

No OpenAI or Anthropic provider keys are required for the normal path. Leave `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` unset so calls route through the Agentuity AI Gateway.

## Run with Agentuity AI Gateway

```bash
bun run dev
```

Then open:

```text
http://127.0.0.1:3500/workbench
```

Use one of the two Workbench agents:

- `jury` evaluates existing content.

  ```json
  {
    "article": "Your article text goes here...",
    "topic": "Optional topic label"
  }
  ```

- `content-jury` writes an article for a topic, then evaluates it.

  ```json
  {
    "topic": "developer productivity"
  }
  ```

The same flows are available as API routes:

- `POST /api/jury`
- `POST /api/content-jury`

## Mastra-only mode

Mastra Studio is still available for inspecting native Mastra agents and workflows, but it does **not** use Agentuity's AI Gateway by itself:

```bash
bun run mastra:dev
```

Use this only when you intentionally want the plain Mastra runtime.

## Build and deploy

```bash
bun run typecheck
bun run lint
bun run build
bun run deploy
```

## AI Gateway notes

- Run through `bun run dev` to use Agentuity gateway routing.
- Do not set provider API keys unless you want to bypass the gateway.
- The OpenAI agents use `createOpenAI()` so Agentuity can patch the AI SDK provider factory for gateway routing.
- The Claude judge uses `new Anthropic()` without a local key so Agentuity can inject Anthropic gateway credentials.
