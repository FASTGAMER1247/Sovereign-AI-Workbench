import { useEffect, useState } from "react";
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, CornerDownLeft, Check } from "lucide-react";

/* ──────────────────────────────────
 * STREAMING TEXT
 * Words resolve out of blur/fade, inline citations appear in
 * context, then actions and follow-up prompts become usable.
 * ────────────────────────────────── */

const DEFAULT_WORD_MS = 80;
const DEFAULT_HOLD_MS = 3400;

export type Token = { text: string; cite?: boolean };

export type Source = {
  name: string;
  domain: string;
  href: string;
  image: string;
};

const DEFAULT_TOKENS: Token[] = [
  ..."Pistachio is your fastest-growing flavor — sales are up 23% this month and margins beat vanilla by 8 points."
    .split(" ")
    .map((text) => ({ text })),
  { text: "", cite: true },
  ..."Stone-fruit flavors are trending in the same range."
    .split(" ")
    .map((text) => ({ text })),
];

const DEFAULT_FOLLOW_UPS = [
  "Which flavors sell best in winter",
  "Compare gelato and soft serve margins",
];

const SOURCE_IMAGES = {
  scoop:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%231f7a5f'/%3E%3Cpath d='M20 36c0 7 5.4 12 12 12s12-5 12-12H20Z' fill='%23fff'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23bff3dd'/%3E%3Cpath d='M24 24c4-7 13-7 17 0' fill='none' stroke='%231f7a5f' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E",
  trends:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%232f6fec'/%3E%3Cpath d='M15 43 27 31l8 7 14-18' fill='none' stroke='%23fff' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='49' cy='20' r='5' fill='%23bfe0ff'/%3E%3C/svg%3E",
  market:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23e56d24'/%3E%3Cpath d='M17 45V25h8v20h-8Zm11 0V16h8v29h-8Zm11 0V30h8v15h-8Z' fill='%23fff'/%3E%3Cpath d='M16 49h32' stroke='%23ffd6b8' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E",
};

const DEFAULT_SOURCES: Source[] = [
  {
    name: "Scoop Data",
    domain: "scoopdata.io",
    href: "https://scoopdata.io/",
    image: SOURCE_IMAGES.scoop,
  },
  {
    name: "Trends Index",
    domain: "trends.google.com",
    href: "https://trends.google.com/trends/",
    image: SOURCE_IMAGES.trends,
  },
  {
    name: "Market Basket",
    domain: "marketbasket.io",
    href: "https://marketbasket.io/",
    image: SOURCE_IMAGES.market,
  },
];

export interface StreamingTextProps {
  className?: string;
  tokens?: Token[];
  followUps?: string[];
  sources?: Source[];
  wordMs?: number;
  holdMs?: number;
  autoLoop?: boolean;
  onFollowUpClick?: (prompt: string) => void;
  onCopy?: (text: string) => void;
  onRetry?: () => void;
  showActions?: boolean;
  showFollowUps?: boolean;
  cursorColor?: string;
}

export function StreamingText({
  className = "w-full font-sans",
  tokens = DEFAULT_TOKENS,
  followUps = DEFAULT_FOLLOW_UPS,
  sources = DEFAULT_SOURCES,
  wordMs = DEFAULT_WORD_MS,
  holdMs = DEFAULT_HOLD_MS,
  autoLoop = true,
  onFollowUpClick,
  onCopy,
  onRetry,
  showActions = true,
  showFollowUps = true,
  cursorColor = "var(--color-accent, #10b981)",
}: StreamingTextProps) {
  const [count, setCount] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const done = count >= tokens.length;

  useEffect(() => {
    if (!autoLoop && done) return;

    const t = setTimeout(
      () => setCount((c) => (c >= tokens.length ? (autoLoop ? 0 : c) : c + 1)),
      done ? holdMs : wordMs,
    );
    return () => clearTimeout(t);
  }, [count, done, tokens.length, wordMs, holdMs, autoLoop]);

  const primarySource = sources[0] || DEFAULT_SOURCES[0];

  const handleCopy = () => {
    const fullText = tokens.map((t) => t.text).filter(Boolean).join(" ");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy?.(fullText);
  };

  return (
    <div className={className}>
      <p className="text-[13px] leading-relaxed text-ink">
        {tokens.slice(0, count).map((token, i) =>
          token.cite ? (
            <a
              key={i}
              href={primarySource.href}
              target="_blank"
              rel="noreferrer"
              className="ml-0 mr-1 inline-flex h-4.5 translate-y-[-1px] items-center gap-1 rounded-[5px]
                bg-inset pr-1.5 pl-[3px] align-middle font-mono text-[10.5px] text-ink-2 shadow-hairline
                transition-colors duration-150 hover:bg-hover hover:text-ink"
              style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}
            >
              <img
                src={primarySource.image}
                alt=""
                className="source-avatar size-3 rounded-[3px]"
              />
              <span>{primarySource.domain}</span>
            </a>
          ) : (
            <span
              key={i}
              className="inline"
              style={{ animation: "fade-in 250ms ease-out both" }}
            >
              {token.text}{" "}
            </span>
          ),
        )}
        {!done && (
          <span
            className="ml-1 inline-block h-3.5 w-0.5 translate-y-0.5 rounded-full"
            style={{
              backgroundColor: cursorColor,
              animation: "fade-in 150ms ease-out both",
            }}
          />
        )}
      </p>

      {/* action icons row */}
      {showActions && (
        <div
          className="mt-2 flex items-center gap-1 transition-opacity duration-400"
          style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}
        >
          <button
            type="button"
            aria-label="Copy"
            onClick={handleCopy}
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3
              transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2"
            title="Copy full text"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>

          <button
            type="button"
            aria-label="Retry"
            onClick={() => {
              setCount(0);
              onRetry?.();
            }}
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3
              transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2"
            title="Regenerate"
          >
            <RotateCcw size={13} />
          </button>

          <button
            type="button"
            aria-label="Helpful"
            onClick={() => setFeedback((f) => (f === "up" ? null : "up"))}
            className={`flex size-6 items-center justify-center rounded-[6px] transition-colors duration-100 ${
              feedback === "up" ? "bg-emerald-500/20 text-emerald-400" : "text-ink-3 hover:bg-hover-2 hover:text-ink-2"
            }`}
            title="Helpful response"
          >
            <ThumbsUp size={13} />
          </button>

          <button
            type="button"
            aria-label="Unhelpful"
            onClick={() => setFeedback((f) => (f === "down" ? null : "down"))}
            className={`flex size-6 items-center justify-center rounded-[6px] transition-colors duration-100 ${
              feedback === "down" ? "bg-red-500/20 text-red-400" : "text-ink-3 hover:bg-hover-2 hover:text-ink-2"
            }`}
            title="Needs improvement"
          >
            <ThumbsDown size={13} />
          </button>

          {sources.length > 0 && (
            <button
              type="button"
              aria-expanded={sourcesOpen}
              onClick={() => setSourcesOpen((current) => !current)}
              className="ml-1.5 flex items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-left transition-colors duration-150 hover:bg-hover cursor-pointer"
            >
              <span className="flex -space-x-1">
                {sources.map((source) => (
                  <img
                    key={source.domain}
                    src={source.image}
                    alt=""
                    className="source-avatar size-3.5 rounded-full bg-surface shadow-[0_0_0:1.5px_var(--canvas)]"
                  />
                ))}
              </span>
              <span className="text-[12px] text-ink-2">{sources.length} sources</span>
            </button>
          )}
        </div>
      )}

      {/* Expandable Sources Tray */}
      {showActions && sources.length > 0 && (
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300"
          style={{
            gridTemplateRows: done && sourcesOpen ? "1fr" : "0fr",
            opacity: done && sourcesOpen ? 1 : 0,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <div className="overflow-hidden">
            <div className="mt-1.5 flex flex-col rounded-[8px] bg-inset p-1 shadow-hairline">
              {sources.map((source) => (
                <a
                  key={source.domain}
                  href={source.href}
                  target={source.href.startsWith("#") ? undefined : "_blank"}
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[6px] px-1.5 py-1 text-[12px] text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink cursor-pointer"
                >
                  <img
                    src={source.image}
                    alt=""
                    className="source-avatar size-4 rounded-[4px]"
                  />
                  <span className="font-medium text-ink">{source.name}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-ink-3">
                    {source.domain}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* follow-ups */}
      {showFollowUps && followUps.length > 0 && (
        <div
          className="mt-2.5 transition-opacity duration-400"
          style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none" }}
        >
          <p className="text-[12px] font-medium text-ink-2">Follow-ups</p>
          <div className="mt-0.5 flex flex-col">
            {followUps.map((text, i) => (
              <button
                key={text}
                type="button"
                onClick={() => onFollowUpClick?.(text)}
                className="-mx-1.5 flex items-center gap-2 border-b border-line
                  px-1.5 py-1.5 text-left text-[12.5px] text-ink transition-colors
                  duration-100 hover:bg-hover-2 cursor-pointer"
                style={
                  done
                    ? {
                        animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both`,
                      }
                    : { opacity: 0 }
                }
              >
                <CornerDownLeft size={11} className="shrink-0 text-ink-3" />
                <span>{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────
// Context-Aware Loading Token Generators for Chat
// ──────────────────────────────────

export function getLoadingTokensForQuery(query: string): Token[] {
  const q = (query || "").toLowerCase();

  if (
    q.includes("thickness") ||
    q.includes("asme") ||
    q.includes("api") ||
    q.includes("pipe") ||
    q.includes("inspection") ||
    q.includes("corrosion") ||
    q.includes("ndt")
  ) {
    return [
      ..."Evaluating ultrasonic wall thickness scans against ASME B31.3 nominal allowances"
        .split(" ")
        .map((text) => ({ text })),
      { text: "", cite: true },
      ..."Cross-referencing SOP-REF-570 minimum thresholds and computing remaining corrosion life..."
        .split(" ")
        .map((text) => ({ text })),
    ];
  }

  if (
    q.includes("python") ||
    q.includes("code") ||
    q.includes("script") ||
    q.includes("sandbox") ||
    q.includes("ast") ||
    q.includes("test") ||
    q.includes("function")
  ) {
    return [
      ..."Parsing Python Abstract Syntax Tree (AST) to intercept forbidden network and OS syscalls"
        .split(" ")
        .map((text) => ({ text })),
      { text: "", cite: true },
      ..."Synthesizing verified calculation routines in isolated subprocess test harness..."
        .split(" ")
        .map((text) => ({ text })),
    ];
  }

  if (
    q.includes("vector") ||
    q.includes("chroma") ||
    q.includes("rag") ||
    q.includes("knowledge") ||
    q.includes("sop") ||
    q.includes("standard")
  ) {
    return [
      ..."Executing semantic cosine similarity retrieval across local ChromaDB vector vault"
        .split(" ")
        .map((text) => ({ text })),
      { text: "", cite: true },
      ..."Grounding response against authenticated engineering safety manuals..."
        .split(" ")
        .map((text) => ({ text })),
    ];
  }

  if (
    q.includes("ledger") ||
    q.includes("sha") ||
    q.includes("audit") ||
    q.includes("hash") ||
    q.includes("security") ||
    q.includes("chain") ||
    q.includes("egress")
  ) {
    return [
      ..."Verifying SHA-256 cryptographic chain integrity across local tamper-evident audit ledger blocks"
        .split(" ")
        .map((text) => ({ text })),
      { text: "", cite: true },
      ..."Confirming zero-egress air-gap isolation and local hardware token proofs..."
        .split(" ")
        .map((text) => ({ text })),
    ];
  }

  // General sovereign assistant reasoning
  return [
    ..."Synthesizing response through local SLM inference engine under strict zero-egress air-gap isolation"
      .split(" ")
      .map((text) => ({ text })),
    { text: "", cite: true },
    ..."Cross-referencing verified engineering context and formatting structured recommendations..."
      .split(" ")
      .map((text) => ({ text })),
  ];
}

export function getLoadingSourcesForQuery(query: string): Source[] {
  const q = (query || "").toLowerCase();

  if (
    q.includes("thickness") ||
    q.includes("asme") ||
    q.includes("api") ||
    q.includes("pipe") ||
    q.includes("inspection") ||
    q.includes("corrosion") ||
    q.includes("ndt")
  ) {
    return [
      {
        name: "API 570 / ASME B31.3",
        domain: "api-570.sop",
        href: "#workflow_a",
        image:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2310b981'/%3E%3Cpath d='M20 36c0 7 5.4 12 12 12s12-5 12-12H20Z' fill='%23fff'/%3E%3C/svg%3E",
      },
    ];
  }

  if (
    q.includes("python") ||
    q.includes("code") ||
    q.includes("script") ||
    q.includes("sandbox") ||
    q.includes("ast") ||
    q.includes("test")
  ) {
    return [
      {
        name: "AST Security Guard",
        domain: "ast-guard.local",
        href: "#workflow_b",
        image:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2338bdf8'/%3E%3Cpath d='M15 43 27 31l8 7 14-18' fill='none' stroke='%23fff' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='49' cy='20' r='5' fill='%23bfe0ff'/%3E%3C/svg%3E",
      },
    ];
  }

  if (
    q.includes("vector") ||
    q.includes("chroma") ||
    q.includes("rag") ||
    q.includes("knowledge") ||
    q.includes("sop") ||
    q.includes("standard")
  ) {
    return [
      {
        name: "ChromaDB Local Vault",
        domain: "chromadb.local",
        href: "#knowledge",
        image:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23e56d24'/%3E%3Cpath d='M17 45V25h8v20h-8Zm11 0V16h8v29h-8Zm11 0V30h8v15h-8Z' fill='%23fff'/%3E%3Cpath d='M16 49h32' stroke='%23ffd6b8' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E",
      },
    ];
  }

  return [
    {
      name: "Air-Gap Local SLM",
      domain: "ollama.local",
      href: "#",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2310b981'/%3E%3Ccircle cx='32' cy='32' r='14' fill='%23fff'/%3E%3C/svg%3E",
    },
  ];
}

export default StreamingText;