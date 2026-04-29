import { useState, useRef } from "react";
import Head from "next/head";

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build an array of {text, type, polarity, role} segments for sentence highlighting.
 * Overlapping spans are resolved by priority: aspect > opinion.
 */
function buildHighlightedSegments(sentence, triplets) {
  if (!triplets || triplets.length === 0) return [{ text: sentence, type: "plain" }];

  // Mark each character: { role: "aspect"|"opinion", polarity }
  const marks = new Array(sentence.length).fill(null);

  const polarityOf = (p) => (p || "neutral").toLowerCase();

  // First pass: opinions
  triplets.forEach(({ opinion, polarity }) => {
    if (!opinion) return;
    const re = new RegExp(escapeRegex(opinion), "gi");
    let m;
    while ((m = re.exec(sentence)) !== null) {
      for (let i = m.index; i < m.index + opinion.length; i++) {
        if (!marks[i]) marks[i] = { role: "opinion", polarity: polarityOf(polarity) };
      }
    }
  });

  // Second pass: aspects (override opinions)
  triplets.forEach(({ aspect }) => {
    if (!aspect) return;
    const re = new RegExp(escapeRegex(aspect), "gi");
    let m;
    while ((m = re.exec(sentence)) !== null) {
      for (let i = m.index; i < m.index + aspect.length; i++) {
        marks[i] = { role: "aspect", polarity: null };
      }
    }
  });

  // Build contiguous segments
  const segments = [];
  let i = 0;
  while (i < sentence.length) {
    const mark = marks[i];
    if (!mark) {
      let j = i + 1;
      while (j < sentence.length && !marks[j]) j++;
      segments.push({ text: sentence.slice(i, j), type: "plain" });
      i = j;
    } else {
      let j = i + 1;
      while (
        j < sentence.length &&
        marks[j] &&
        marks[j].role === mark.role &&
        marks[j].polarity === mark.polarity
      )
        j++;
      segments.push({ text: sentence.slice(i, j), type: mark.role, polarity: mark.polarity });
      i = j;
    }
  }
  return segments;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HighlightedSentence({ sentence, triplets }) {
  const segments = buildHighlightedSegments(sentence, triplets);

  const bgMap = {
    aspect: "var(--highlight-aspect)",
    "opinion-positive": "var(--highlight-opinion-pos)",
    "opinion-negative": "var(--highlight-opinion-neg)",
    "opinion-neutral": "var(--highlight-opinion-neu)",
  };

  return (
    <p style={{ fontFamily: "'Fraunces', serif", fontSize: "1.15rem", lineHeight: 1.8, color: "var(--text)" }}>
      {segments.map((seg, idx) => {
        if (seg.type === "plain") return <span key={idx}>{seg.text}</span>;
        const key = seg.type === "aspect" ? "aspect" : `opinion-${seg.polarity}`;
        const bg = bgMap[key] || "transparent";
        const isAspect = seg.type === "aspect";
        return (
          <span
            key={idx}
            title={isAspect ? "Aspect" : `Opinion (${seg.polarity})`}
            style={{
              background: bg,
              borderRadius: "4px",
              padding: "1px 3px",
              borderBottom: `2px solid ${isAspect ? "var(--accent)" : seg.polarity === "positive" ? "var(--pos)" : seg.polarity === "negative" ? "var(--neg)" : "var(--neu)"}`,
              cursor: "default",
              transition: "background 0.2s",
            }}
          >
            {seg.text}
          </span>
        );
      })}
    </p>
  );
}

function TripletCard({ aspect, opinion, polarity, index }) {
  const pol = (polarity || "neutral").toLowerCase();
  const color = pol === "positive" ? "var(--pos)" : pol === "negative" ? "var(--neg)" : "var(--neu)";
  const bg = pol === "positive" ? "var(--pos-bg)" : pol === "negative" ? "var(--neg-bg)" : "var(--neu-bg)";
  const border = pol === "positive" ? "var(--pos-border)" : pol === "negative" ? "var(--neg-border)" : "var(--neu-border)";
  const emoji = pol === "positive" ? "+" : pol === "negative" ? "−" : "○";

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "12px",
        padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr auto",
        alignItems: "center",
        gap: "12px",
        animation: `fadeSlideIn 0.35s ease both`,
        animationDelay: `${index * 0.07}s`,
      }}
    >
      <div>
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Aspect</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.95rem", color: "var(--accent)", fontWeight: 500 }}>{aspect}</div>
      </div>

      <div style={{ color: "var(--text-dim)", fontSize: "1.1rem" }}>→</div>

      <div>
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Opinion</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.95rem", color: "var(--text)", fontWeight: 500 }}>{opinion}</div>
      </div>

      <div
        style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "20px",
          padding: "5px 14px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "1rem", fontWeight: 700 }}>{emoji}</span>
        {polarity}
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { color: "var(--accent)", border: "var(--highlight-aspect)", label: "Aspect term" },
    { color: "var(--pos)", border: "var(--highlight-opinion-pos)", label: "Positive opinion" },
    { color: "var(--neg)", border: "var(--highlight-opinion-neg)", label: "Negative opinion" },
    { color: "var(--neu)", border: "var(--highlight-opinion-neu)", label: "Neutral opinion" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "12px" }}>
      {items.map(({ color, border, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-block",
              width: "28px",
              height: "12px",
              background: `${color}22`,
              borderRadius: "3px",
              borderBottom: `2px solid ${color}`,
            }}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "'DM Mono', monospace" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const EXAMPLES = [
  "The battery life is amazing but the screen is really dim.",
  "Their pasta was delicious but the service was unbearably slow.",
  "Great camera quality, decent price, but the software crashes frequently.",
];

export default function Home() {
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState(null); // { sentence, triplets }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  async function handleExtract() {
    if (!sentence.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setResult({ sentence: sentence.trim(), triplets: data.triplets });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function loadExample(ex) {
    setSentence(ex);
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  }

  return (
    <>
      <Head>
        <title>ASTE — Aspect Sentiment Triplet Extraction</title>
        <meta name="description" content="Extract aspect-opinion-polarity triplets from any sentence using Qwen3." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,180,255,0); }
          50%       { box-shadow: 0 0 24px 4px rgba(200,180,255,0.18); }
        }
        textarea:focus { outline: none; }
        textarea::placeholder { color: var(--text-dim); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .example-btn:hover { background: var(--surface2) !important; border-color: var(--border-bright) !important; }
        .submit-btn:hover:not(:disabled) { background: #d4c0ff !important; animation: pulseGlow 1.2s infinite; }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* ── Header ── */}
        <header
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "22px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "1.5rem",
                letterSpacing: "-0.01em",
                color: "var(--accent)",
              }}
            >
              ASTE
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "var(--text-dim)", letterSpacing: "0.1em" }}>
              ASPECT SENTIMENT TRIPLET EXTRACTION
            </span>
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.65rem",
              color: "var(--text-dim)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "5px 10px",
              letterSpacing: "0.06em",
            }}
          >
            qwen3-235b-a22b
          </div>
        </header>

        {/* ── Main ── */}
        <main style={{ flex: 1, maxWidth: "820px", width: "100%", margin: "0 auto", padding: "48px 24px" }}>
          {/* Hero */}
          <div style={{ marginBottom: "44px", animation: "fadeSlideIn 0.5s ease both" }}>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 600,
                fontSize: "clamp(2rem, 5vw, 3.2rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                marginBottom: "14px",
              }}
            >
              Extract what's
              <br />
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>actually being said.</span>
            </h1>
            <p style={{ fontFamily: "'Syne', sans-serif", color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.6, maxWidth: "520px" }}>
              Enter any sentence and instantly surface structured sentiment — every aspect, its opinion, and polarity — powered by Qwen3.
            </p>
          </div>

          {/* Input card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              overflow: "hidden",
              marginBottom: "24px",
              animation: "fadeSlideIn 0.5s ease 0.1s both",
            }}
          >
            <textarea
              ref={textareaRef}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleExtract();
              }}
              placeholder="Type or paste a sentence here…"
              rows={4}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                resize: "none",
                padding: "24px",
                fontFamily: "'Fraunces', serif",
                fontSize: "1.05rem",
                color: "var(--text)",
                lineHeight: 1.7,
              }}
            />
            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface2)",
              }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "var(--text-dim)" }}>
                ⌘ + Enter to run
              </span>
              <button
                className="submit-btn"
                onClick={handleExtract}
                disabled={loading || !sentence.trim()}
                style={{
                  background: "var(--accent)",
                  color: "#0a0a0f",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 24px",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "12px",
                        height: "12px",
                        border: "2px solid #0a0a0f44",
                        borderTop: "2px solid #0a0a0f",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Extracting…
                  </>
                ) : (
                  "Extract →"
                )}
              </button>
            </div>
          </div>

          {/* Example sentences */}
          <div style={{ marginBottom: "40px", animation: "fadeSlideIn 0.5s ease 0.2s both" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "var(--text-dim)", marginBottom: "10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Try an example
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  className="example-btn"
                  onClick={() => loadExample(ex)}
                  style={{
                    background: "var(--surface)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "20px",
                    padding: "6px 14px",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                    textAlign: "left",
                  }}
                >
                  {ex.length > 52 ? ex.slice(0, 52) + "…" : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "var(--neg-bg)",
                border: "1px solid var(--neg-border)",
                borderRadius: "12px",
                padding: "16px 20px",
                color: "var(--neg)",
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.85rem",
                marginBottom: "28px",
                animation: "fadeSlideIn 0.3s ease both",
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
              {/* Highlighted sentence */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "24px",
                  marginBottom: "24px",
                }}
              >
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--text-dim)", marginBottom: "14px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Sentence Analysis
                </p>
                <HighlightedSentence sentence={result.sentence} triplets={result.triplets} />
                <Legend />
              </div>

              {/* Triplets */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Extracted Triplets
                  </p>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.7rem",
                      color: "var(--accent)",
                      background: "var(--accent-glow)",
                      border: "1px solid rgba(200,180,255,0.2)",
                      borderRadius: "12px",
                      padding: "3px 10px",
                    }}
                  >
                    {result.triplets.length} found
                  </span>
                </div>

                {result.triplets.length === 0 ? (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "28px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.85rem",
                    }}
                  >
                    No sentiment triplets detected in this sentence.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {result.triplets.map((t, i) => (
                      <TripletCard key={i} index={i} aspect={t.aspect} opinion={t.opinion} polarity={t.polarity} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "18px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface)",
          }}
        >
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--text-dim)" }}>
            Powered by Qwen3-235B via DashScope
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "var(--text-dim)" }}>
            (aspect, opinion, polarity)
          </span>
        </footer>
      </div>
    </>
  );
}
