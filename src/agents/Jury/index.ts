import type { AgentRequest, AgentResponse, AgentContext } from '@agentuity/sdk';
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client for Claude
// Note: This requires an API key to be set as an environment variable
let anthropicClient: Anthropic | null = null;
try {
  anthropicClient = new Anthropic();
} catch (error) {
  console.error('Failed to initialize Anthropic client. Claude evaluation will be skipped.');
}

export const welcome = () => {
  return {
    welcome:
      'Welcome to the Multi-Model AI Jury! I evaluate content using different AI models like GPT-4, Claude, and others to provide a balanced assessment.',
    prompts: [
      {
        data: 'Paste your blog post or article here for evaluation by multiple AI models.',
        contentType: 'text/plain',
      }
    ],
  };
};

export default async function JuryAgent(
  req: AgentRequest,
  resp: AgentResponse,
  ctx: AgentContext
) {
  try {
    // Get the blog post content from the request
    const blogPost = await req.data.text();
    
    if (!blogPost || blogPost.trim() === '') {
      return resp.text('No content was provided for evaluation.');
    }
    
    // Check if this is a handoff from ContentWriter
    const source = req.get('source') as string;
    const topic = req.get('topic') as string;
    const isHandoff = source === 'ContentWriter';
    
    if (isHandoff) {
      ctx.logger.info(`Received handoff from ContentWriter with topic: ${topic}`);
    } else {
      ctx.logger.info('Evaluating content submitted directly');
    }
    
    ctx.logger.info('Evaluating content with multiple AI models');
    
    // Define our evaluation criteria for each model
    const evaluationPrompt = `
    Evaluate the following content on a scale of 1-10 for these criteria:
    - Clarity: How clear and understandable is the content?
    - Structure: How well-organized is the content?
    - Engagement: How engaging and interesting is the content?
    - Technical accuracy: How factually accurate is the content?
    
    For each criterion, provide a score out of 10 and a brief explanation.
    End with an overall score that averages all criteria.
    
    Content to evaluate:
    ${blogPost}
    `;
    
    // Create different model judges
    // GPT-4o mini as first judge
    const gpt4oMiniJudge = new Agent({
      name: 'GPT-4o Mini',
      instructions: 'You are a precise and thorough evaluator of written content.',
      model: openai('gpt-4o-mini'),
    });
    
    // GPT-4 as second judge
    const gpt4Judge = new Agent({
      name: 'GPT-4',
      instructions: 'You are a critical and detailed evaluator of content who focuses on technical merits.',
      model: openai('gpt-4o'), // Using gpt-4o as our most capable OpenAI model
    });
    
    // Array to collect model evaluations
    const modelEvaluations: Array<{name: string; evaluation: string}> = [];
    const modelScores: Array<{clarity: number; structure: number; engagement: number; technical: number; overall: number}> = [];
    
    // Run OpenAI model evaluations in parallel
    const [gpt4oMiniResult, gpt4Result] = await Promise.all([
      gpt4oMiniJudge.generate(evaluationPrompt),
      gpt4Judge.generate(evaluationPrompt)
    ]);
    
    // Add OpenAI model results
    modelEvaluations.push({
      name: 'GPT-4o Mini',
      evaluation: gpt4oMiniResult.text
    });
    
    modelEvaluations.push({
      name: 'GPT-4',
      evaluation: gpt4Result.text
    });
    
    // Extract scores from OpenAI models
    const gpt4oMiniScores = extractScores(gpt4oMiniResult.text);
    const gpt4Scores = extractScores(gpt4Result.text);
    
    modelScores.push(gpt4oMiniScores);
    modelScores.push(gpt4Scores);
    
    // Check if Claude is available and use it
    if (anthropicClient) {
      try {
        // Use Claude API directly
        const claudeResponse = await anthropicClient.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          system: 'You are a critical evaluator of written content focused on stylistic elements and clarity.',
          messages: [
            {
              role: 'user',
              content: evaluationPrompt
            }
          ]
        });
        
        // Safely extract Claude's text response
        let claudeText = 'Claude evaluation completed, but the response format could not be processed.';
        
        // Handle Claude API response carefully to avoid type errors
        try {
          if (claudeResponse?.content && Array.isArray(claudeResponse.content) && claudeResponse.content.length > 0) {
            // Claude API returns content as an array of blocks
            const firstContent = claudeResponse.content[0];
            
            // Check if it's a text block with a text property
            if (firstContent && typeof firstContent === 'object' && 'type' in firstContent && firstContent.type === 'text') {
              claudeText = String(firstContent.text || '');
            }
          }
        } catch (parseError) {
          ctx.logger.error('Error parsing Claude response:', parseError);
        }
        
        // Add Claude result
        modelEvaluations.push({
          name: 'Claude (Anthropic)',
          evaluation: claudeText
        });
        
        // Extract Claude scores if we have a response
        if (claudeText && claudeText.length > 0) {
          const claudeScores = extractScores(claudeText);
          modelScores.push(claudeScores);
        }
      } catch (error) {
        ctx.logger.error('Error using Claude API:', error);
        modelEvaluations.push({
          name: 'Claude (Anthropic) - Error',
          evaluation: 'Claude evaluation failed. This model may require API credentials to be configured.'
        });
      }
    } else {
      modelEvaluations.push({
        name: 'Claude (Anthropic) - Not Available',
        evaluation: 'Claude evaluation was skipped. This model requires API credentials to be configured.'
      });
    }
    
    // Calculate average scores across available models
    const totalModels = modelScores.length;
    const avgClarity = modelScores.reduce((sum, model) => sum + model.clarity, 0) / totalModels;
    const avgStructure = modelScores.reduce((sum, model) => sum + model.structure, 0) / totalModels;
    const avgEngagement = modelScores.reduce((sum, model) => sum + model.engagement, 0) / totalModels;
    const avgTechnical = modelScores.reduce((sum, model) => sum + model.technical, 0) / totalModels;
    
    // Calculate overall average score
    const overallScore = ((avgClarity + avgStructure + avgEngagement + avgTechnical) / 4).toFixed(1);
    
    // Start with the article itself
    let formattedResponse = `
=======================================================================
                         ARTICLE TO EVALUATE                          
=======================================================================

${blogPost}

`;

    // Add the evaluation header
    formattedResponse += `
=======================================================================
                    MULTI-MODEL AI JURY EVALUATION                    
=======================================================================
`;

    // Add topic information if provided by ContentWriter
    if (isHandoff && topic) {
      formattedResponse += `
TOPIC: ${topic}
`;
    }

    formattedResponse += `
OVERALL CONSENSUS SCORE: ${overallScore}/10

`;

    // Add each model's evaluation with better formatting
    modelEvaluations.forEach((model, index) => {
      // Skip Claude if it's not available or errored
      if (model.name.includes('Not Available') || model.name.includes('Error')) {
        return;
      }

      // Add scores for this model if available
      let modelScoresText = '';
      if (index < modelScores.length) {
        // Make sure we get the score object safely
        const scoreObj = modelScores[index] || {
          clarity: 0,
          structure: 0,
          engagement: 0,
          technical: 0,
          overall: 0
        };
        
        modelScoresText = `
· Clarity: ${scoreObj.clarity.toFixed(1)}/10
· Structure: ${scoreObj.structure.toFixed(1)}/10
· Engagement: ${scoreObj.engagement.toFixed(1)}/10
· Technical: ${scoreObj.technical.toFixed(1)}/10
· Overall: ${scoreObj.overall.toFixed(1)}/10
`;
      }

      formattedResponse += `
=======================================================================
${index + 1}. EVALUATION BY: ${model.name.toUpperCase()}
=======================================================================
${modelScoresText}
${model.evaluation}

`;
    });
    
    // Add consensus scores
    formattedResponse += `
=======================================================================
                       CONSENSUS SCORES SUMMARY                       
=======================================================================
· Clarity:          ${avgClarity.toFixed(1)}/10
· Structure:        ${avgStructure.toFixed(1)}/10 
· Engagement:       ${avgEngagement.toFixed(1)}/10
· Technical:        ${avgTechnical.toFixed(1)}/10
· OVERALL AVERAGE:  ${overallScore}/10
`;

    // Add source information for transparency
    if (isHandoff) {
      formattedResponse += `

This evaluation was requested automatically by the ContentWriter agent.`;
    }
    
    // Return formatted text response
    return resp.text(formattedResponse);
  } catch (error) {
    ctx.logger.error('Error evaluating with multi-model jury:', error);
    return resp.text('Sorry, there was an error running the AI Jury evaluation.');
  }
}

// Extract individual criteria scores from the evaluation text
function extractScores(text: string): { clarity: number; structure: number; engagement: number; technical: number; overall: number } {
  // Default scores in case we can't extract them
  const scores = {
    clarity: 5,
    structure: 5,
    engagement: 5,
    technical: 5,
    overall: 5
  };
  
  // Try to find each score in the text using regex
  const clarityMatch = text.match(/clarity:?\s*(\d+(\.\d+)?)\s*\/\s*10/i);
  if (clarityMatch?.[1]) {
    scores.clarity = Number.parseFloat(clarityMatch[1]);
  }
  
  const structureMatch = text.match(/structure:?\s*(\d+(\.\d+)?)\s*\/\s*10/i);
  if (structureMatch?.[1]) {
    scores.structure = Number.parseFloat(structureMatch[1]);
  }
  
  const engagementMatch = text.match(/engagement:?\s*(\d+(\.\d+)?)\s*\/\s*10/i);
  if (engagementMatch?.[1]) {
    scores.engagement = Number.parseFloat(engagementMatch[1]);
  }
  
  const technicalMatch = text.match(/technical:?\s*(\d+(\.\d+)?)\s*\/\s*10/i) || 
                         text.match(/technical accuracy:?\s*(\d+(\.\d+)?)\s*\/\s*10/i) ||
                         text.match(/accuracy:?\s*(\d+(\.\d+)?)\s*\/\s*10/i);
  if (technicalMatch?.[1]) {
    scores.technical = Number.parseFloat(technicalMatch[1]);
  }
  
  const overallMatch = text.match(/overall:?\s*(\d+(\.\d+)?)\s*\/\s*10/i);
  if (overallMatch?.[1]) {
    scores.overall = Number.parseFloat(overallMatch[1]);
  }
  
  return scores;
}
