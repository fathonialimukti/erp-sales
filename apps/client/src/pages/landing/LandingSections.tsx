// ── Landing illustrations (theme-aware via semantic CSS vars) ──
// IDs are prefixed per-illustration to avoid duplicate-ID gradient bugs.

import approvalFlowImg from "../../assets/images/landing/ai-approval-workflow.webp";
import emailWorkflowImg from "../../assets/images/landing/ai-email-workflow.webp";

export const DecorBlob = ({
  className,
  variant = "a",
}: {
  className?: string;
  variant?: "a" | "b" | "c";
}) => {
  const id = `blob-${variant}`;
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M44.8,-58.4C57.4,-49.6,66.2,-35.4,69.8,-19.9C73.4,-4.4,71.8,12.4,64.6,26.4C57.4,40.4,44.6,51.6,30.4,59.4C16.2,67.2,0.6,71.6,-14.6,69.8C-29.8,68,-44.6,60,-55.4,48.4C-66.2,36.8,-73,21.6,-73.4,6.2C-73.8,-9.2,-67.8,-25.8,-57.2,-38.6C-46.6,-51.4,-31.4,-60.4,-15.8,-64.8C-0.2,-69.2,15.8,-69,30.2,-66.4C44.6,-63.8,32.2,-67.2,44.8,-58.4Z"
        transform="translate(100 100)"
      />
    </svg>
  );
};

export const HeroDashboard = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 560 420"
    fill="none"
    role="img"
    aria-label="ERP Sales dashboard preview"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="hd-card" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--card)" />
        <stop offset="100%" stopColor="var(--muted)" />
      </linearGradient>
      <linearGradient id="hd-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="hd-bar" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="var(--primary)" />
        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.55" />
      </linearGradient>
      <filter id="hd-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.12" />
      </filter>
    </defs>

    <rect x="20" y="20" width="520" height="380" rx="20" fill="url(#hd-card)" filter="url(#hd-shadow)" />
    <rect x="20" y="20" width="520" height="380" rx="20" fill="none" stroke="var(--border)" />

    <circle cx="44" cy="44" r="5" fill="var(--muted-foreground)" opacity="0.35" />
    <circle cx="62" cy="44" r="5" fill="var(--muted-foreground)" opacity="0.35" />
    <circle cx="80" cy="44" r="5" fill="var(--primary)" />
    <rect x="220" y="38" width="120" height="12" rx="6" fill="var(--muted)" />

    <rect x="20" y="64" width="120" height="336" fill="var(--muted)" opacity="0.55" />
    <rect x="36" y="84" width="88" height="10" rx="5" fill="var(--primary)" opacity="0.16" />
    <rect x="36" y="84" width="56" height="10" rx="5" fill="var(--primary)" />
    <rect x="36" y="112" width="88" height="9" rx="4.5" fill="var(--muted-foreground)" opacity="0.28" />
    <rect x="36" y="134" width="72" height="9" rx="4.5" fill="var(--muted-foreground)" opacity="0.22" />
    <rect x="36" y="156" width="80" height="9" rx="4.5" fill="var(--muted-foreground)" opacity="0.22" />
    <rect x="36" y="178" width="64" height="9" rx="4.5" fill="var(--muted-foreground)" opacity="0.22" />

    <rect x="156" y="84" width="116" height="64" rx="12" fill="var(--card)" stroke="var(--border)" />
    <rect x="172" y="100" width="40" height="8" rx="4" fill="var(--muted-foreground)" opacity="0.3" />
    <rect x="172" y="116" width="64" height="16" rx="6" fill="url(#hd-bar)" />
    <rect x="284" y="84" width="116" height="64" rx="12" fill="var(--card)" stroke="var(--border)" />
    <rect x="300" y="100" width="40" height="8" rx="4" fill="var(--muted-foreground)" opacity="0.3" />
    <rect x="300" y="116" width="56" height="16" rx="6" fill="var(--primary)" opacity="0.75" />
    <rect x="412" y="84" width="108" height="64" rx="12" fill="var(--card)" stroke="var(--border)" />
    <rect x="428" y="100" width="40" height="8" rx="4" fill="var(--muted-foreground)" opacity="0.3" />
    <rect x="428" y="116" width="60" height="16" rx="6" fill="var(--primary)" opacity="0.45" />

    <rect x="156" y="164" width="244" height="180" rx="12" fill="var(--card)" stroke="var(--border)" />
    <polyline
      points="176,300 206,280 236,292 266,250 296,262 326,224 356,236 386,200"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M176,300 206,280 236,292 266,250 296,262 326,224 356,236 386,200 L386,324 L176,324 Z"
      fill="url(#hd-area)"
    />
    {[
      [176, 300],
      [206, 280],
      [236, 292],
      [266, 250],
      [296, 262],
      [326, 224],
      [356, 236],
      [386, 200],
    ].map(([cx, cy], i) => (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r="3.5"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="2.5"
      />
    ))}

    <rect x="412" y="164" width="108" height="180" rx="12" fill="var(--card)" stroke="var(--border)" />
    <circle cx="466" cy="232" r="34" fill="none" stroke="var(--muted)" strokeWidth="12" />
    <circle
      cx="466"
      cy="232"
      r="34"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="12"
      strokeLinecap="round"
      strokeDasharray="150 214"
      transform="rotate(-90 466 232)"
    />
    <circle cx="466" cy="232" r="9" fill="var(--card)" />

    <g transform="translate(360 300)">
      <rect
        x="0"
        y="0"
        width="150"
        height="56"
        rx="14"
        fill="var(--card)"
        stroke="var(--border)"
        filter="url(#hd-shadow)"
      />
      <circle cx="28" cy="28" r="16" fill="var(--primary)" opacity="0.12" />
      <path
        d="M21 28l5 5 9-10"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="54" y="18" width="80" height="8" rx="4" fill="var(--muted-foreground)" opacity="0.28" />
      <rect x="54" y="34" width="56" height="8" rx="4" fill="var(--primary)" opacity="0.65" />
    </g>
  </svg>
);

export const ApprovalFlow = ({ className }: { className?: string }) => (
  <img
    src={approvalFlowImg}
    alt="Approval workflow: Draft is reviewed by an AI before it can be Proposed, then Approved or Rejected — with a full audit trail"
    className={className}
  />
);

export const EmailToOrderFlow = ({ className }: { className?: string }) => (
  <img
    src={emailWorkflowImg}
    alt="Email-to-order automation: customer email becomes a sales order"
    className={className}
  />
);

export const AiWorkflow = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 760 340"
    fill="none"
    role="img"
    aria-label="AI workflow: user inputs are processed by an LLM engine with RAG and tools"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="ai-engine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
        <stop offset="100%" stopColor="var(--primary)" />
      </linearGradient>
      <linearGradient id="ai-out" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.08" />
        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.16" />
      </linearGradient>
      <marker id="ai-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
        <path
          d="M1 1L8 5L1 9"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </marker>
      <filter id="ai-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.08" />
      </filter>
    </defs>

    <rect
      x="20"
      y="40"
      width="150"
      height="64"
      rx="14"
      fill="var(--card)"
      stroke="var(--border)"
      filter="url(#ai-shadow)"
    />
    <circle cx="48" cy="72" r="14" fill="var(--primary)" opacity="0.12" />
    <path d="M42 72h12M48 66v12" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    <text x="72" y="68" fontSize="13" fontWeight="600" fill="var(--foreground)">
      Chat prompt
    </text>
    <text x="72" y="86" fontSize="10" fill="var(--muted-foreground)">
      ask anything
    </text>

    <rect
      x="20"
      y="138"
      width="150"
      height="64"
      rx="14"
      fill="var(--card)"
      stroke="var(--border)"
      filter="url(#ai-shadow)"
    />
    <circle cx="48" cy="170" r="14" fill="var(--primary)" opacity="0.12" />
    <path
      d="M43 170l4 4 7-8"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text x="72" y="166" fontSize="13" fontWeight="600" fill="var(--foreground)">
      Order text
    </text>
    <text x="72" y="184" fontSize="10" fill="var(--muted-foreground)">
      email / paste
    </text>

    <rect
      x="20"
      y="236"
      width="150"
      height="64"
      rx="14"
      fill="var(--card)"
      stroke="var(--border)"
      filter="url(#ai-shadow)"
    />
    <circle cx="48" cy="268" r="14" fill="var(--primary)" opacity="0.12" />
    <path d="M42 268h12M48 262v12" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    <text x="72" y="264" fontSize="13" fontWeight="600" fill="var(--foreground)">
      Page context
    </text>
    <text x="72" y="282" fontSize="10" fill="var(--muted-foreground)">
      current screen
    </text>

    <path d="M170 72 H286" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#ai-arrow)" />
    <path d="M170 170 H286" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#ai-arrow)" />
    <path d="M170 268 H286" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#ai-arrow)" />

    <rect
      x="290"
      y="50"
      width="180"
      height="240"
      rx="18"
      fill="url(#ai-engine)"
      stroke="var(--primary)"
      filter="url(#ai-shadow)"
    />
    <text x="380" y="84" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--primary-foreground)">
      LLM Engine
    </text>
    <text x="380" y="104" textAnchor="middle" fontSize="10" fill="var(--primary-foreground)" opacity="0.85">
      chatModel · streaming
    </text>
    <line x1="310" y1="118" x2="450" y2="118" stroke="var(--primary-foreground)" strokeWidth="1" opacity="0.35" />

    <rect x="310" y="128" width="140" height="32" rx="10" fill="var(--card)" />
    <circle cx="330" cy="144" r="8" fill="var(--primary)" opacity="0.15" />
    <path d="M326 144h8M330 140v8" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" />
    <text x="346" y="148" fontSize="11" fontWeight="600" fill="var(--foreground)">
      RAG · Docs
    </text>

    <text x="380" y="180" textAnchor="middle" fontSize="10" fill="var(--primary-foreground)" opacity="0.8">
      TOOLS
    </text>
    <rect x="305" y="188" width="66" height="26" rx="8" fill="var(--card)" />
    <text x="338" y="205" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--foreground)">
      navigate
    </text>
    <rect x="379" y="188" width="66" height="26" rx="8" fill="var(--card)" />
    <text x="412" y="205" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--foreground)">
      queryDB
    </text>
    <rect x="305" y="222" width="140" height="26" rx="8" fill="var(--card)" />
    <text x="375" y="239" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--foreground)">
      fillFormFields
    </text>
    <text x="380" y="276" textAnchor="middle" fontSize="9" fill="var(--primary-foreground)" opacity="0.8">
      + read-only SQL
    </text>

    <path d="M470 58 H586" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#ai-arrow)" />
    <path d="M470 128 H586" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#ai-arrow)" />
    <path d="M470 198 H586" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#ai-arrow)" />
    <path d="M470 268 H586" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#ai-arrow)" />

    <rect
      x="590"
      y="30"
      width="150"
      height="56"
      rx="14"
      fill="url(#ai-out)"
      stroke="var(--primary)"
      strokeOpacity="0.3"
      filter="url(#ai-shadow)"
    />
    <text x="615" y="54" fontSize="12" fontWeight="600" fill="var(--primary)">
      Streaming answer
    </text>
    <text x="615" y="72" fontSize="10" fill="var(--muted-foreground)">
      chat reply
    </text>

    <rect
      x="590"
      y="100"
      width="150"
      height="56"
      rx="14"
      fill="url(#ai-out)"
      stroke="var(--primary)"
      strokeOpacity="0.3"
      filter="url(#ai-shadow)"
    />
    <text x="615" y="124" fontSize="12" fontWeight="600" fill="var(--primary)">
      Structured order
    </text>
    <text x="615" y="142" fontSize="10" fill="var(--muted-foreground)">
      validated schema
    </text>

    <rect
      x="590"
      y="170"
      width="150"
      height="56"
      rx="14"
      fill="url(#ai-out)"
      stroke="var(--primary)"
      strokeOpacity="0.3"
      filter="url(#ai-shadow)"
    />
    <text x="615" y="194" fontSize="12" fontWeight="600" fill="var(--primary)">
      SQL insight
    </text>
    <text x="615" y="212" fontSize="10" fill="var(--muted-foreground)">
      read-only query
    </text>

    <rect
      x="590"
      y="240"
      width="150"
      height="56"
      rx="14"
      fill="url(#ai-out)"
      stroke="var(--primary)"
      strokeOpacity="0.3"
      filter="url(#ai-shadow)"
    />
    <text x="615" y="264" fontSize="12" fontWeight="600" fill="var(--primary)">
      Summary / Draft
    </text>
    <text x="615" y="282" fontSize="10" fill="var(--muted-foreground)">
      follow-up, reply
    </text>
  </svg>
);

export const RagArchitecture = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 800 340"
    fill="none"
    role="img"
    aria-label="How the AI learns from your business: you add documents, the AI reads and understands them, then answers questions using your own information"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="rag-node" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--card)" />
        <stop offset="100%" stopColor="var(--muted)" />
      </linearGradient>
      <linearGradient id="rag-accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
        <stop offset="100%" stopColor="var(--primary)" />
      </linearGradient>
      <marker id="rag-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
        <path d="M1 1L8 5L1 9" fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
      <filter id="rag-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.08" />
      </filter>
      <filter id="rag-text-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.9" />
      </filter>
    </defs>

    {/* Step 1: Your Documents */}
    <g>
      <rect x="40" y="70" width="150" height="150" rx="20" fill="url(#rag-node)" stroke="var(--border)" filter="url(#rag-shadow)" />
      <rect x="70" y="95" width="90" height="70" rx="8" fill="var(--primary)" opacity="0.08" />
      <rect x="80" y="108" width="70" height="6" rx="3" fill="var(--primary)" opacity="0.4" />
      <rect x="80" y="120" width="55" height="5" rx="2.5" fill="var(--muted-foreground)" opacity="0.35" />
      <rect x="80" y="130" width="62" height="5" rx="2.5" fill="var(--muted-foreground)" opacity="0.3" />
      <rect x="80" y="140" width="45" height="5" rx="2.5" fill="var(--muted-foreground)" opacity="0.25" />
      <rect x="100" y="172" width="50" height="20" rx="6" fill="var(--primary)" opacity="0.12" />
      <text x="115" y="186" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--primary)">.pdf</text>
      <text x="115" y="210" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)">Your Docs</text>
      <text x="115" y="232" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">Policies, FAQs, SOPs</text>
    </g>

    {/* Step 2: AI Reads & Understands */}
    <g>
      <rect x="235" y="70" width="150" height="150" rx="20" fill="url(#rag-node)" stroke="var(--border)" filter="url(#rag-shadow)" />
      <circle cx="310" cy="130" r="32" fill="var(--primary)" opacity="0.08" />
      <circle cx="310" cy="130" r="20" fill="var(--primary)" opacity="0.12" />
      <path d="M300 125 Q305 115 315 115 Q325 115 325 125 Q325 132 318 135 L318 142" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <circle cx="310" cy="148" r="2.5" fill="var(--primary)" opacity="0.7" />
      <text x="310" y="210" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)">AI Understands</text>
      <text x="310" y="232" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">Meaning, not keywords</text>
    </g>

    {/* Step 3: Smart Search */}
    <g>
      <rect x="430" y="70" width="150" height="150" rx="20" fill="url(#rag-node)" stroke="var(--border)" filter="url(#rag-shadow)" />
      <circle cx="505" cy="130" r="22" fill="none" stroke="var(--primary)" strokeWidth="2.5" opacity="0.5" />
      <circle cx="505" cy="130" r="10" fill="none" stroke="var(--primary)" strokeWidth="2" opacity="0.4" />
      <circle cx="505" cy="130" r="3" fill="var(--primary)" opacity="0.6" />
      <line x1="520" y1="145" x2="530" y2="155" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <text x="505" y="210" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)">Smart Search</text>
      <text x="505" y="232" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">Matches question to docs</text>
    </g>

    {/* Step 4: AI Answers */}
    <g>
      <rect x="625" y="70" width="150" height="150" rx="20" fill="url(#rag-node)" stroke="var(--primary)" strokeWidth="2" filter="url(#rag-shadow)" />
      <rect x="655" y="108" width="90" height="50" rx="12" fill="var(--primary)" opacity="0.08" />
      <text x="700" y="130" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)" opacity="0.7">How do I...</text>
      <text x="700" y="144" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)" opacity="0.7">process refunds?</text>
      <rect x="660" y="165" width="80" height="28" rx="8" fill="var(--primary)" />
      <text x="700" y="183" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--primary-foreground)">Answer!</text>
      <text x="700" y="210" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)">AI Answers</text>
      <text x="700" y="232" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)" filter="url(#rag-text-shadow)">Using your own words</text>
    </g>

    {/* Arrows */}
    <path d="M190 145 L235 145" stroke="var(--primary)" strokeWidth="2.5" markerEnd="url(#rag-arrow)" strokeDasharray="6 4" />
    <path d="M385 145 L430 145" stroke="var(--primary)" strokeWidth="2.5" markerEnd="url(#rag-arrow)" strokeDasharray="6 4" />
    <path d="M580 145 L625 145" stroke="var(--primary)" strokeWidth="2.5" markerEnd="url(#rag-arrow)" strokeDasharray="6 4" />

    {/* Step numbers */}
    <circle cx="55" cy="55" r="11" fill="var(--primary)" />
    <text x="55" y="59" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary-foreground)">1</text>
    <circle cx="250" cy="55" r="11" fill="var(--primary)" />
    <text x="250" y="59" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary-foreground)">2</text>
    <circle cx="445" cy="55" r="11" fill="var(--primary)" />
    <text x="445" y="59" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary-foreground)">3</text>
    <circle cx="640" cy="55" r="11" fill="var(--primary)" />
    <text x="640" y="59" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary-foreground)">4</text>
  </svg>
);

export const RagTechnicalDiagram = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 1000 600"
    fill="none"
    role="img"
    aria-label="Technical RAG architecture: ai-embedding.ts generates vectors, rag.ts handles hybrid retrieval, knowledge-base router triggers embedding on save with status tracking, all stored in Postgres pgvector"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="rt-config" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--muted)" />
        <stop offset="100%" stopColor="var(--card)" />
      </linearGradient>
      <linearGradient id="rt-engine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="rt-store" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--success)" stopOpacity="0.15" />
        <stop offset="100%" stopColor="var(--success)" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="rt-rag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.15" />
        <stop offset="100%" stopColor="var(--warning)" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="rt-client" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--info)" stopOpacity="0.15" />
        <stop offset="100%" stopColor="var(--info)" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="rt-consumer" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.1" />
      </linearGradient>
      <marker id="rt-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M1 1L7 4L1 7" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
      <marker id="rt-arrow-primary" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M1 1L7 4L1 7" fill="none" stroke="var(--primary)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
      <filter id="rt-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.06" />
      </filter>
    </defs>

    {/* ── Config box (top-left) ── */}
    <g>
      <rect x="20" y="20" width="180" height="130" rx="10" fill="url(#rt-config)" stroke="var(--border)" filter="url(#rt-shadow)" />
      <text x="110" y="42" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">AI Provider Settings</text>
      <line x1="35" y1="50" x2="185" y2="50" stroke="var(--border)" strokeWidth="0.5" />
      <text x="35" y="68" fontSize="9" fill="var(--muted-foreground)">ai.baseUrl</text>
      <text x="35" y="82" fontSize="9" fill="var(--muted-foreground)">ai.model</text>
      <text x="35" y="96" fontSize="9" fill="var(--muted-foreground)">ai.apiKey (secret)</text>
      <text x="35" y="110" fontSize="9" fill="var(--muted-foreground)">embedding.similarityThreshold</text>
      <text x="35" y="124" fontSize="9" fill="var(--muted-foreground)">  (default 0.5)</text>
      <text x="35" y="138" fontSize="9" fill="var(--muted-foreground)">dimensions: 1536 (fixed)</text>
    </g>

    {/* ── Embedding Engine (center-top) ── */}
    <g>
      <rect x="240" y="20" width="220" height="130" rx="10" fill="url(#rt-engine)" stroke="var(--primary)" strokeWidth="1.5" filter="url(#rt-shadow)" />
      <text x="350" y="42" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">ai-embedding.ts</text>
      <line x1="255" y1="50" x2="445" y2="50" stroke="var(--primary)" strokeWidth="0.5" opacity="0.4" />
      <text x="255" y="68" fontSize="9" fill="var(--foreground)">generateEmbedding(db, text)</text>
      <text x="255" y="82" fontSize="9" fill="var(--foreground)">generateEmbeddings(db, values[])</text>
      <text x="255" y="96" fontSize="9" fill="var(--foreground)">upsertChunkEmbedding(id, vec)</text>
      <text x="255" y="110" fontSize="9" fill="var(--foreground)">clearChunkEmbedding(id) + status=none</text>
      <text x="255" y="124" fontSize="9" fill="var(--foreground)">setChunkEmbeddingStatus(id, status)</text>
      <text x="255" y="138" fontSize="9" fill="var(--foreground)">embedKnowledgeChunkBestEffort()</text>
    </g>

    {/* ── Vector Store (right) ── */}
    <g>
      <rect x="500" y="20" width="200" height="130" rx="10" fill="url(#rt-store)" stroke="var(--success)" strokeWidth="1.5" filter="url(#rt-shadow)" />
      <text x="600" y="42" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">Postgres (pgvector)</text>
      <line x1="515" y1="50" x2="685" y2="50" stroke="var(--success)" strokeWidth="0.5" opacity="0.4" />
      <text x="515" y="68" fontSize="9" fill="var(--foreground)">knowledge_chunks</text>
      <text x="515" y="82" fontSize="9" fill="var(--muted-foreground)">  embedding vector(1536)</text>
      <text x="515" y="96" fontSize="9" fill="var(--muted-foreground)">  embedding_model text</text>
      <text x="515" y="110" fontSize="9" fill="var(--muted-foreground)">  embedding_status</text>
      <text x="515" y="124" fontSize="9" fill="var(--muted-foreground)">    (pending|done|failed|none)</text>
      <text x="515" y="138" fontSize="9" fill="var(--muted-foreground)">  HNSW cosine index</text>
    </g>

    {/* ── RAG Retrieval (center) ── */}
    <g>
      <rect x="240" y="190" width="220" height="130" rx="10" fill="url(#rt-rag)" stroke="var(--warning)" strokeWidth="1.5" filter="url(#rt-shadow)" />
      <text x="350" y="212" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">rag.ts</text>
      <line x1="255" y1="220" x2="445" y2="220" stroke="var(--warning)" strokeWidth="0.5" opacity="0.4" />
      <text x="255" y="238" fontSize="9" fill="var(--foreground)">searchKnowledgeChunksFts()</text>
      <text x="255" y="252" fontSize="9" fill="var(--foreground)">searchKnowledgeChunksVector()</text>
      <text x="255" y="266" fontSize="9" fill="var(--foreground)">mergeKnowledgeHits()</text>
      <text x="255" y="280" fontSize="9" fill="var(--foreground)">searchKnowledgeChunks() (hybrid)</text>
      <text x="255" y="294" fontSize="9" fill="var(--foreground)">formatKnowledgeHits()</text>
      <text x="255" y="308" fontSize="9" fill="var(--foreground)">  → system prompt injection</text>
    </g>

    {/* ── Triggers (left-center) ── */}
    <g>
      <rect x="20" y="190" width="180" height="130" rx="10" fill="url(#rt-config)" stroke="var(--border)" filter="url(#rt-shadow)" />
      <text x="110" y="212" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">Write Triggers</text>
      <line x1="35" y1="220" x2="185" y2="220" stroke="var(--border)" strokeWidth="0.5" />
      <text x="35" y="238" fontSize="9" fill="var(--muted-foreground)">knowledge-base router</text>
      <text x="35" y="252" fontSize="9" fill="var(--muted-foreground)">  create → set pending</text>
      <text x="35" y="266" fontSize="9" fill="var(--muted-foreground)">  update → clear + re-embed</text>
      <text x="35" y="280" fontSize="9" fill="var(--muted-foreground)">ingest-knowledge.ts</text>
      <text x="35" y="294" fontSize="9" fill="var(--muted-foreground)">  batch embed on import</text>
      <text x="35" y="308" fontSize="9" fill="var(--muted-foreground)">  (never fails mutation)</text>
    </g>

    {/* ── Client-side (center-bottom) ── */}
    <g>
      <rect x="240" y="360" width="220" height="100" rx="10" fill="url(#rt-client)" stroke="var(--info)" strokeWidth="1.5" filter="url(#rt-shadow)" />
      <text x="350" y="382" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">Client-side Polling</text>
      <line x1="255" y1="390" x2="445" y2="390" stroke="var(--info)" strokeWidth="0.5" opacity="0.4" />
      <text x="255" y="408" fontSize="9" fill="var(--muted-foreground)">Form page: poll detail every 2s</text>
      <text x="255" y="422" fontSize="9" fill="var(--muted-foreground)">  Progress bar while pending</text>
      <text x="255" y="436" fontSize="9" fill="var(--muted-foreground)">Detail page: poll + status badge</text>
      <text x="255" y="450" fontSize="9" fill="var(--muted-foreground)">Index page: poll list every 5s</text>
    </g>

    {/* ── Consumers (bottom-center) ── */}
    <g>
      <rect x="500" y="360" width="220" height="100" rx="10" fill="url(#rt-consumer)" stroke="var(--primary)" strokeWidth="1.5" filter="url(#rt-shadow)" />
      <text x="610" y="382" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">AI Assistant</text>
      <line x1="515" y1="390" x2="705" y2="390" stroke="var(--primary)" strokeWidth="0.5" opacity="0.4" />
      <text x="515" y="408" fontSize="9" fill="var(--muted-foreground)">routes/ai.ts (chat)</text>
      <text x="515" y="422" fontSize="9" fill="var(--muted-foreground)">routes/ai-admin.ts</text>
      <text x="515" y="436" fontSize="9" fill="var(--muted-foreground)">formatKnowledgeHits()</text>
      <text x="515" y="450" fontSize="9" fill="var(--muted-foreground)">→ system prompt context</text>
    </g>

    {/* ── Status legend (bottom-left) ── */}
    <g>
      <rect x="20" y="360" width="180" height="100" rx="10" fill="url(#rt-config)" stroke="var(--border)" filter="url(#rt-shadow)" />
      <text x="110" y="382" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">Embedding Status</text>
      <line x1="35" y1="390" x2="185" y2="390" stroke="var(--border)" strokeWidth="0.5" />
      <circle cx="45" cy="408" r="4" fill="var(--warning)" />
      <text x="55" y="411" fontSize="9" fill="var(--muted-foreground)">pending (embedding...)</text>
      <circle cx="45" cy="424" r="4" fill="var(--success)" />
      <text x="55" y="427" fontSize="9" fill="var(--muted-foreground)">done (embedded)</text>
      <circle cx="45" cy="440" r="4" fill="var(--destructive)" />
      <text x="55" y="443" fontSize="9" fill="var(--muted-foreground)">failed (error)</text>
      <circle cx="130" cy="408" r="4" fill="var(--muted-foreground)" />
      <text x="140" y="411" fontSize="9" fill="var(--muted-foreground)">none (unconfigured)</text>
    </g>

    {/* ── Formula box (bottom-right) ── */}
    <g>
      <rect x="760" y="360" width="220" height="100" rx="10" fill="url(#rt-config)" stroke="var(--border)" filter="url(#rt-shadow)" />
      <text x="870" y="382" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--foreground)">Similarity</text>
      <line x1="775" y1="390" x2="965" y2="390" stroke="var(--border)" strokeWidth="0.5" />
      <text x="870" y="408" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">1 − (embedding &lt;=&gt; query)</text>
      <text x="870" y="424" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">cosine similarity</text>
      <text x="870" y="438" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">threshold ≥ 0.5</text>
      <text x="870" y="452" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">FTS fallback if no vectors</text>
    </g>

    {/* ── Arrows: Config → Engine ── */}
    <path d="M200 70 L240 70" stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#rt-arrow)" />
    <text x="220" y="63" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">config</text>

    {/* ── Arrows: Engine → Store ── */}
    <path d="M460 70 L500 70" stroke="var(--primary)" strokeWidth="1.5" markerEnd="url(#rt-arrow-primary)" />
    <text x="480" y="63" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">vector(1536)</text>

    {/* ── Arrows: Engine → RAG ── */}
    <path d="M350 150 L350 190" stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#rt-arrow)" />
    <text x="358" y="173" fontSize="8" fill="var(--muted-foreground)">embed</text>

    {/* ── Arrows: Triggers → Engine ── */}
    <path d="M200 240 L240 240" stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#rt-arrow)" />
    <text x="220" y="233" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">void (fire-and-forget)</text>

    {/* ── Arrows: Triggers → RAG (clear) ── */}
    <path d="M200 260 L240 260" stroke="var(--muted-foreground)" strokeWidth="1.5" markerEnd="url(#rt-arrow)" strokeDasharray="4 3" />
    <text x="220" y="253" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">clear + status=none</text>

    {/* ── Arrows: Store → RAG ── */}
    <path d="M500 140 L460 190" stroke="var(--success)" strokeWidth="1.5" markerEnd="url(#rt-arrow)" />
    <text x="475" y="163" fontSize="8" fill="var(--muted-foreground)">query</text>

    {/* ── Arrows: RAG → Client ── */}
    <path d="M350 320 L350 360" stroke="var(--info)" strokeWidth="1.5" markerEnd="url(#rt-arrow)" />
    <text x="358" y="343" fontSize="8" fill="var(--muted-foreground)">status</text>

    {/* ── Arrows: RAG → Consumers ── */}
    <path d="M460 240 L500 360" stroke="var(--primary)" strokeWidth="1.5" markerEnd="url(#rt-arrow-primary)" />
    <text x="475" y="290" fontSize="8" fill="var(--muted-foreground)">hits</text>

    {/* ── Arrow: Store → Formula ── */}
    <path d="M700 140 L870 360" stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="3 3" markerEnd="url(#rt-arrow)" opacity="0.5" />
  </svg>
);
