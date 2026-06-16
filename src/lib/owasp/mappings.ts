// OWASP Agentic Top 10 (2026) category definitions used for finding badges.

export interface OWASPCategory {
  id: string;
  name: string;
  description: string;
  link: string;
  /** Tailwind-friendly hex color for the badge. */
  color: string;
}

export const OWASP_CATEGORIES: Record<string, OWASPCategory> = {
  ASI01: {
    id: "ASI01",
    name: "Agent Goal Hijack",
    description:
      "An attacker subverts the agent's objective via injected instructions, redirecting it toward attacker-chosen goals.",
    link: "https://genai.owasp.org/",
    color: "#f43f5e",
  },
  ASI02: {
    id: "ASI02",
    name: "Tool Misuse & Exploitation",
    description:
      "Tools are abused — individually or in combination — to perform actions outside the user's intent.",
    link: "https://genai.owasp.org/",
    color: "#fb7185",
  },
  ASI03: {
    id: "ASI03",
    name: "Agent Identity & Privilege Abuse",
    description:
      "Excessive privilege, leaked credentials, or weak authentication let an agent act beyond its authority.",
    link: "https://genai.owasp.org/",
    color: "#f97316",
  },
  ASI04: {
    id: "ASI04",
    name: "Agentic Supply Chain Compromise",
    description:
      "Malicious or tampered packages, servers, or dependencies enter the agent's toolchain.",
    link: "https://genai.owasp.org/",
    color: "#eab308",
  },
  ASI05: {
    id: "ASI05",
    name: "Unexpected Code Execution",
    description:
      "Configuration permits arbitrary or shell code execution beyond the intended tool behavior.",
    link: "https://genai.owasp.org/",
    color: "#a855f7",
  },
  ASI06: {
    id: "ASI06",
    name: "Memory & Context Poisoning",
    description:
      "Persistent agent memory or context is contaminated with attacker-controlled content.",
    link: "https://genai.owasp.org/",
    color: "#8b5cf6",
  },
  ASI07: {
    id: "ASI07",
    name: "Insecure Inter-Agent Communication",
    description:
      "Network exposure or unauthenticated channels between agents/servers enable interception or injection.",
    link: "https://genai.owasp.org/",
    color: "#3b82f6",
  },
  ASI08: {
    id: "ASI08",
    name: "Cascading Hallucinations & Failures",
    description:
      "Errors propagate across chained tools and agents, amplifying incorrect or harmful outcomes.",
    link: "https://genai.owasp.org/",
    color: "#06b6d4",
  },
  ASI09: {
    id: "ASI09",
    name: "Inadequate Human Oversight",
    description:
      "Missing approval gates or visibility let high-impact agent actions proceed unchecked.",
    link: "https://genai.owasp.org/",
    color: "#14b8a6",
  },
  ASI10: {
    id: "ASI10",
    name: "Rogue Agents",
    description:
      "An agent operates outside its intended scope or governance, acting autonomously against the operator.",
    link: "https://genai.owasp.org/",
    color: "#64748b",
  },
};

export const getOwaspCategory = (id: string): OWASPCategory | undefined =>
  OWASP_CATEGORIES[id];

export const OWASP_TOP10_LINK = "https://genai.owasp.org/";
