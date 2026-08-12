import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_CONTEXT = `You are an expert GRC (Governance, Risk & Compliance) consultant for South African and global businesses. 
You specialize in POPIA, ISO 27001, SOC 2, GDPR, NIS2, King IV, and other frameworks.
You provide practical, actionable advice tailored to the South African business context.
Always be specific, professional, and use South African English where appropriate.
When mentioning monetary penalties, use ZAR (South African Rand).
Format responses in clear Markdown when appropriate.`;

// AI Policy Drafter
export async function draftPolicy(params: {
  title: string;
  description: string;
  industry: string;
  frameworks: string[];
  orgName: string;
}): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_CONTEXT,
    messages: [
      {
        role: 'user',
        content: `Draft a comprehensive ${params.title} for ${params.orgName}, a ${params.industry} company.

Policy context: ${params.description}
Compliance frameworks to align with: ${params.frameworks.join(', ')}

Please create a complete, professional policy document with:
1. Policy Purpose & Scope
2. Policy Statement
3. Definitions
4. Roles and Responsibilities
5. Policy Requirements (detailed sections)
6. Compliance & Enforcement
7. Review Schedule
8. Related Documents

Make it specific to South African context where relevant, especially regarding POPIA if included.
Format as a professional policy document in Markdown.`,
      },
    ],
  });

  return (message.content[0] as { text: string }).text;
}

// AI Risk Assessor
export async function assessRisk(params: {
  title: string;
  description: string;
  category: string;
  industry: string;
  orgSize: string;
}): Promise<{
  likelihood: string;
  impact: string;
  score: number;
  rationale: string;
  mitigations: string[];
  frameworks: string[];
}> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: SYSTEM_CONTEXT,
    messages: [
      {
        role: 'user',
        content: `Assess the following risk for a ${params.industry} company with ${params.orgSize} employees:

Risk Title: ${params.title}
Description: ${params.description}
Category: ${params.category}

Provide a structured risk assessment in JSON format with:
{
  "likelihood": "rare|unlikely|possible|likely|almost_certain",
  "impact": "negligible|minor|moderate|major|catastrophic",
  "score": <number 1-25>,
  "rationale": "<explanation of the assessment>",
  "mitigations": ["<mitigation 1>", "<mitigation 2>", "<mitigation 3>", "<mitigation 4>", "<mitigation 5>"],
  "frameworks": ["<relevant framework 1>", "<relevant framework 2>"]
}

Consider South African regulatory context, POPIA requirements, and local threat landscape.
Return ONLY the JSON, no other text.`,
      },
    ],
  });

  const text = (message.content[0] as { text: string }).text;
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return {
      likelihood: 'possible',
      impact: 'moderate',
      score: 9,
      rationale: text,
      mitigations: ['Implement controls', 'Monitor regularly', 'Train staff'],
      frameworks: ['ISO 27001', 'POPIA'],
    };
  }
}

// AI Chat Assistant
export async function chatWithGRC(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  orgContext: string;
}): Promise<string> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `${SYSTEM_CONTEXT}\n\nOrganisation context: ${params.orgContext}\n\nYou are the embedded GRC assistant for this organisation. Help them with compliance questions, risk guidance, policy advice, and regulatory updates. Be conversational but professional.`,
      messages: params.messages,
    });

    const text = (message.content[0] as { text: string })?.text;
    if (!text) {
      throw new Error('No response content received from Claude API');
    }
    return text;
  } catch (err: any) {
    // Surface the real Anthropic error instead of hiding it
    console.error('Anthropic API error (full):', JSON.stringify(err, null, 2));
    console.error('Anthropic error status:', err?.status);
    console.error('Anthropic error message:', err?.message);
    throw new Error(`Claude API error: ${err?.status || ''} ${err?.message || err?.error?.message || 'unknown error'}`);
  }
}

// AI Regulatory Scanner
export async function scanRegulations(params: {
  industry: string;
  frameworks: string[];
  country: string;
}): Promise<{
  alerts: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    framework: string;
    action_required: string;
    deadline?: string;
  }>;
  summary: string;
}> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: SYSTEM_CONTEXT,
    messages: [
      {
        role: 'user',
        content: `As a regulatory scanner, identify the most important current compliance considerations and recent regulatory changes for:

Industry: ${params.industry}
Country: ${params.country}
Tracked Frameworks: ${params.frameworks.join(', ')}

Generate realistic regulatory alerts and compliance updates that a ${params.industry} company in ${params.country} should be aware of. Include POPIA-related updates if relevant.

Return JSON format:
{
  "alerts": [
    {
      "title": "<alert title>",
      "description": "<detailed description>",
      "severity": "low|medium|high|critical",
      "framework": "<relevant framework>",
      "action_required": "<what the company should do>",
      "deadline": "<optional deadline or timeframe>"
    }
  ],
  "summary": "<2-3 sentence summary of regulatory landscape>"
}

Generate 5-7 realistic, relevant alerts. Return ONLY JSON.`,
      },
    ],
  });

  const text = (message.content[0] as { text: string }).text;
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return {
      alerts: [],
      summary: text,
    };
  }
}

export default client;
