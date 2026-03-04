import "server-only";

// NEW: OpenAI Client for Proposal Evaluation
//
// Uses OpenAI Chat Completions API to evaluate proposals against fund mandates.
// Validates responses with Zod schema and retries once if JSON is invalid.

import {
  type LLMEvaluationResponse,
  validateLLMResponse,
} from "@/lib/evaluation/types";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Get OpenAI configuration from environment
function getOpenAIConfig(): { apiKey: string; model: string; baseUrl: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. " +
      "Please set it in your .env.local file."
    );
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RunEvaluationLLMParams {
  mandateText: string;
  proposalText: string;
  context: {
    proposalId: string;
    fundName: string;
    mandateKey: string | null;
  };
}

export interface RunEvaluationLLMResult {
  success: boolean;
  response?: LLMEvaluationResponse;
  model: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────────────────

// NEW: System prompt for evaluation
const SYSTEM_PROMPT = `You are an expert investment analyst reviewing proposals against fund mandates.

Your task is to evaluate how well a proposal fits a fund's investment mandate and provide a structured assessment.

Guidelines:
- Be objective and thorough in your analysis
- Consider alignment with strategy, geography, and investment criteria
- Identify both strengths and potential risks
- Provide actionable recommendations
- Confidence level should reflect the quality of information provided

You MUST respond with valid JSON only, no additional text.`;

// NEW: Build user prompt with content and schema
function buildUserPrompt(
  mandateText: string,
  proposalText: string,
  context: { proposalId: string; fundName: string; mandateKey: string | null }
): string {
  return `## Fund Mandate
${mandateText || "No mandate template content available."}

## Proposal (ID: ${context.proposalId}, Fund: ${context.fundName})
${proposalText || "No proposal document content available."}

## Required Output Format (JSON)
Respond with a JSON object matching this exact schema:
{
  "fitScore": <number 0-100, where 100 is perfect fit>,
  "mandateSummary": "<1-2 sentence summary of the mandate's key requirements>",
  "proposalSummary": "<1-2 sentence summary of what the proposal is asking for>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "risks": ["<risk 1>", "<risk 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "confidence": "<'low' | 'medium' | 'high' - based on information quality>"
}

Respond with ONLY the JSON object, no markdown formatting or additional text.`;
}

// NEW: Retry prompt when JSON is invalid
function buildRetryPrompt(originalResponse: string, error: string): string {
  return `Your previous response was not valid JSON. Error: ${error}

Please fix the JSON and respond with ONLY a valid JSON object matching this schema:
{
  "fitScore": <number 0-100>,
  "mandateSummary": "<string>",
  "proposalSummary": "<string>",
  "strengths": ["<string>", ...],
  "risks": ["<string>", ...],
  "recommendations": ["<string>", ...],
  "confidence": "<'low' | 'medium' | 'high'>"
}

Your previous response was:
${originalResponse.substring(0, 500)}${originalResponse.length > 500 ? "..." : ""}

Respond with ONLY valid JSON, no additional text or markdown.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI API Call
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Call OpenAI Chat Completions API
async function callOpenAI(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  config: { apiKey: string; model: string; baseUrl: string }
): Promise<{ content: string; model: string }> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid OpenAI response: no content in response");
  }

  return {
    content: data.choices[0].message.content,
    model: data.model || config.model,
  };
}

// NEW: Parse JSON from LLM response (handles markdown code blocks)
function parseJSONResponse(content: string): unknown {
  let jsonStr = content.trim();
  
  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  
  jsonStr = jsonStr.trim();
  
  return JSON.parse(jsonStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Evaluation Function
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Run LLM evaluation with retry on invalid JSON
export async function runEvaluationLLM(
  params: RunEvaluationLLMParams
): Promise<RunEvaluationLLMResult> {
  const { mandateText, proposalText, context } = params;

  try {
    const config = getOpenAIConfig();

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(mandateText, proposalText, context) },
    ];

    // First attempt
    const firstResponse = await callOpenAI(messages, config);
    
    try {
      const parsed = parseJSONResponse(firstResponse.content);
      const validation = validateLLMResponse(parsed);
      
      if (validation.success && validation.data) {
        return {
          success: true,
          response: validation.data,
          model: firstResponse.model,
        };
      }

      // Invalid schema, retry with fix prompt
      console.warn("[openaiClient] First response validation failed:", validation.error);
      
      messages.push({ role: "assistant", content: firstResponse.content });
      messages.push({ role: "user", content: buildRetryPrompt(firstResponse.content, validation.error || "Invalid schema") });

      const retryResponse = await callOpenAI(messages, config);
      const retryParsed = parseJSONResponse(retryResponse.content);
      const retryValidation = validateLLMResponse(retryParsed);

      if (retryValidation.success && retryValidation.data) {
        return {
          success: true,
          response: retryValidation.data,
          model: retryResponse.model,
        };
      }

      return {
        success: false,
        model: retryResponse.model,
        error: `LLM response validation failed after retry: ${retryValidation.error}`,
      };

    } catch (parseError) {
      // JSON parse failed, retry with fix prompt
      console.warn("[openaiClient] JSON parse failed:", parseError);

      messages.push({ role: "assistant", content: firstResponse.content });
      messages.push({
        role: "user",
        content: buildRetryPrompt(
          firstResponse.content,
          parseError instanceof Error ? parseError.message : "Invalid JSON"
        ),
      });

      const retryResponse = await callOpenAI(messages, config);
      
      try {
        const retryParsed = parseJSONResponse(retryResponse.content);
        const retryValidation = validateLLMResponse(retryParsed);

        if (retryValidation.success && retryValidation.data) {
          return {
            success: true,
            response: retryValidation.data,
            model: retryResponse.model,
          };
        }

        return {
          success: false,
          model: retryResponse.model,
          error: `LLM response validation failed after retry: ${retryValidation.error}`,
        };
      } catch (retryParseError) {
        return {
          success: false,
          model: config.model,
          error: `Failed to parse LLM response after retry: ${retryParseError instanceof Error ? retryParseError.message : "Unknown error"}`,
        };
      }
    }

  } catch (error) {
    console.error("[openaiClient] LLM evaluation failed:", error);
    return {
      success: false,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// NEW: Check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
