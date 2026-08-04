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
