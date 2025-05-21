<div align="center">
    <img src="https://raw.githubusercontent.com/agentuity/cli/refs/heads/main/.github/Agentuity.png" alt="Agentuity" width="100"/> <br/>
    <strong>Build Agents, Not Infrastructure</strong> <br/>
<br />
</div>

# 🤖 Bun Agent Project

Welcome to your Agentuity Bun Agent project! This README provides essential information to help you get started with developing, testing, and deploying your AI agents.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Bun**: Version 1.2.4 or higher

## 🚀 Getting Started

### Authentication

Before using Agentuity, you need to authenticate:

```bash
agentuity login
```

This command will open a browser window where you can log in to your Agentuity account.

### Creating a New Agent

To create a new agent in your project:

```bash
agentuity agent new
```

Follow the interactive prompts to configure your agent.

### Development Mode

Run your project in development mode with:

```bash
agentuity dev
```

This will start your project and open a new browser window connecting your Agent to the Agentuity Console in Live Mode, allowing you to test and debug your agent in real-time.

## 🌐 Deployment

When you're ready to deploy your agent to the Agentuity Cloud:

```bash
agentuity deploy
```

This command will bundle your agent and deploy it to the cloud, making it accessible via the Agentuity platform.

## 📚 Project Structure

```
├── agents/             # Agent definitions and implementations
├── node_modules/       # Dependencies
├── package.json        # Project dependencies and scripts
└── agentuity.yaml      # Agentuity project configuration
```

## 🔧 Configuration

Your project configuration is stored in `agentuity.yaml`. This file defines your agents, development settings, and deployment configuration.

## 🛠️ Advanced Usage

### Environment Variables

You can set environment variables for your project:

```bash
agentuity env set KEY=VALUE
```

### Secrets Management

For sensitive information, use secrets:

```bash
agentuity env set --secret KEY=VALUE
```

## 📖 Documentation

For comprehensive documentation on the Agentuity JavaScript SDK, visit:
[https://agentuity.dev/SDKs/javascript](https://agentuity.dev/SDKs/javascript)

## 🆘 Troubleshooting

If you encounter any issues:

1. Check the [documentation](https://agentuity.dev/SDKs/javascript)
2. Join our [Discord community](https://discord.com/invite/vtn3hgUfuc) for support
3. Contact the Agentuity support team

## 📝 License

This project is licensed under the terms specified in the LICENSE file.

# LLM as Jury System

This project uses Agentuity to create a multi-agent system where one AI agent (ContentWriter) creates blog posts, and another AI agent (Jury) evaluates them on multiple criteria.

## Overview

- **ContentWriter Agent**: Takes a topic as input and generates a well-structured blog post about that topic
- **Jury Agent**: Evaluates blog posts across multiple criteria (readability, technical accuracy, engagement)

## How It Works

1. The ContentWriter agent receives a topic and uses OpenAI to generate a high-quality blog post
2. The Jury agent receives the blog post and evaluates it using multiple specialized "judge" LLMs
3. Each judge evaluates the blog post on a specific criterion and provides a score out of 10
4. The Jury agent combines all evaluations and returns a comprehensive assessment

## Setup

1. Make sure you have [Bun](https://bun.sh/) installed
2. Install dependencies: `bun install`
3. Start the development server: `agentuity dev`

## Using the Agents

### Via DevMode UI

1. Open the DevMode URL provided when you start `agentuity dev`
2. Select the ContentWriter agent
3. Enter a topic (e.g., "artificial intelligence", "climate change", etc.)
4. The agent will generate a blog post
5. Copy the blog post
6. Select the Jury agent
7. Paste the blog post and submit
8. View the detailed evaluation

### Via CLI Test Client

You can use the test client in `index.ts` to interact with the agents:

```bash
# Generate a blog post on a topic
bun run index.ts ContentWriter "artificial intelligence"

# Evaluate a blog post (paste the blog content as the argument)
bun run index.ts Jury "Your blog post content here..."

# Run the full workflow (ContentWriter -> Jury)
bun run index.ts workflow "technology trends"
```

## Agent Details

### ContentWriter

The ContentWriter agent uses the Mastra framework with OpenAI's gpt-4o-mini model to generate blog posts based on a given topic. The generated blog post includes:

- An engaging title
- A clear introduction
- Well-organized body paragraphs with subheadings
- A conclusion

### Jury

The Jury agent is a multi-model evaluation system that uses several different AI models to provide a balanced assessment of content. By default, it uses:

1. **GPT-4o Mini**: A precise and thorough evaluator
2. **GPT-4o**: A critical and detailed evaluator focused on technical merits

It's also configured to use **Claude** from Anthropic if the API key is provided.

Each model evaluates the content on four criteria:
- Clarity
- Structure 
- Engagement
- Technical accuracy

The Jury agent then combines these evaluations to provide consensus scores across all models.

#### Adding More Models to the Jury

To use Claude, you need to set the Anthropic API key as an environment variable:

```bash
agentuity env set --secret ANTHROPIC_API_KEY=your_api_key_here
```

To add other models like Grok, Llama, or Mistral, you would need to:

1. Install the appropriate SDK
2. Configure API credentials
3. Update the Jury agent code to use the new model

This modular approach allows you to create a diverse panel of AI judges for more balanced evaluations.

## Example Usage

```
# Run the full workflow with a topic
bun run index.ts workflow "artificial intelligence"

# This will:
# 1. Generate a blog post about artificial intelligence
# 2. Send the blog post to the Jury for evaluation by multiple AI models
# 3. Display the evaluation results from each model and consensus scores
```

## Deployment

To deploy your agents to the Agentuity cloud:

```bash
agentuity deploy
```
