type ClaudeMessage = {
  role: "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: any }>;
};

type ClaudeOptions = {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  messages: ClaudeMessage[];
};

export async function callClaude({ apiKey, model, maxTokens, messages }: ClaudeOptions): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: maxTokens || 1500,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude API error:", errorText);
    throw new Error("AI APIの呼び出しに失敗しました");
  }

  const data: any = await response.json();
  return data.content?.[0]?.text || "";
}
