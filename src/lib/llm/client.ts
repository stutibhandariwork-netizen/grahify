import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type * as z from "zod/v4";
import { SYSTEM_PROMPT } from "./system-prompt";

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

/** Without a key the app runs in preview mode: it shows what Claude would be sent. */
export const claudeEnabled = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;

export class InterpretationError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/**
 * One structured interpretation call. The system prompt is shared by every
 * reading type and cached; `userContent` carries the data and the task, or a
 * whole conversation whose last user turn does.
 */
export async function interpret<T extends z.ZodType>(
  schema: T,
  userContent: string | Anthropic.Beta.BetaMessageParam[],
): Promise<z.infer<T>> {
  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on a suitable model within the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: typeof userContent === "string" ? [{ role: "user", content: userContent }] : userContent,
      output_config: { effort: "high", format: betaZodOutputFormat(schema) },
    });

    if (response.stop_reason === "refusal") {
      throw new InterpretationError("The reading could not be written for this request.", false);
    }
    if (response.stop_reason === "max_tokens") {
      throw new InterpretationError("The reading was cut off before it finished.", true);
    }
    if (!response.parsed_output) {
      throw new InterpretationError("The reading came back in an unexpected format.", true);
    }
    return response.parsed_output;
  } catch (error) {
    if (error instanceof InterpretationError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new InterpretationError("The Claude API key is not valid.", false);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new InterpretationError("Too many readings at once. Please try again in a minute.", true);
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new InterpretationError(`Claude rejected the request: ${error.message}`, false);
    }
    if (error instanceof Anthropic.APIError) {
      throw new InterpretationError(`Claude is unavailable right now (${error.status ?? "network"}).`, true);
    }
    throw error;
  }
}
