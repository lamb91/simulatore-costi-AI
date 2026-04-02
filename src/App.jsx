import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import "./App.css";

// ─── Formatting helpers ───
const fmt = (n) => (typeof n === "number" ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n);
const fmtInt = (n) => (typeof n === "number" ? n.toLocaleString("it-IT") : n);
const fmtEur = (n) => `€ ${fmt(n)}`;

// ─── Period options ───
const PERIOD_OPTIONS = [
  { value: 1, label: "al mese" },
  { value: 3, label: "3 mesi (trimestre)" },
  { value: 5, label: "5 mesi" },
  { value: 6, label: "6 mesi (semestre)" },
  { value: 7, label: "7 mesi" },
  { value: 12, label: "12 mesi (anno)" },
  { value: 0, label: "Personalizzato..." },
];

// ─── Color constants ───
const COLORS = {
  asr: "#083866",
  tts: "#F7941F",
  llm: "#27ae60",
};

// ─── Default pricing (editable) ───
const DEFAULT_PRICES = {
  google_asr_standard: 0.024,
  google_asr_enhanced: 0.036,
  google_tts_standard: 4.0,
  google_tts_wavenet: 16.0,
  google_tts_neural2: 16.0,
  google_tts_studio: 30.0,
  elevenlabs_flash_25: 0.06,
  elevenlabs_multi_v1: 0.12,
  elevenlabs_multi_v2: 0.12,
  gemini_flash_input: 0.30,
  gemini_flash_output: 2.50,
  gpt41_input: 2.00,
  gpt41_output: 8.00,
};

// ─── Model option labels ───
const ASR_MODELS = {
  google_asr_standard: "Google STT — Standard",
  google_asr_enhanced: "Google STT — Enhanced",
};

const TTS_MODELS = {
  google_tts_standard: "Google TTS — Standard",
  google_tts_wavenet: "Google TTS — WaveNet",
  google_tts_neural2: "Google TTS — Neural2",
  google_tts_studio: "Google TTS — Studio / Chirp 3",
  elevenlabs_flash_25: "ElevenLabs — Flash 2.5",
  elevenlabs_multi_v1: "ElevenLabs — Multilingual v1",
  elevenlabs_multi_v2: "ElevenLabs — Multilingual v2",
};

const LLM_MODELS = {
  gemini_flash: "Gemini 2.5 Flash",
  gpt41: "GPT-4.1",
};

// ─── Profiles for quick mode ───
const PROFILES = [
  {
    id: "voicebot-eco",
    name: "Voicebot Economico",
    desc: "Voicebot con STT Google standard, TTS Google WaveNet e Gemini Flash. Ideale per volumi alti dove il costo è prioritario.",
    config: {
      conversations: 10000, avgDurationSec: 90, turnsPerConv: 3,
      asrModel: "google_asr_standard", ttsModel: "google_tts_wavenet", llmModel: "gemini_flash",
      avgInputTokens: 300, avgOutputTokens: 150, avgTtsChars: 120, pctWithTts: 100,
    },
    specs: ["STT Standard", "TTS WaveNet", "Gemini Flash", "~90s/conv"],
  },
  {
    id: "voicebot-premium",
    name: "Voicebot Premium",
    desc: "Voicebot con STT Enhanced, TTS ElevenLabs Flash 2.5 e GPT-4.1. Per esperienze vocali di qualità superiore.",
    config: {
      conversations: 10000, avgDurationSec: 120, turnsPerConv: 4,
      asrModel: "google_asr_enhanced", ttsModel: "elevenlabs_flash_25", llmModel: "gpt41",
      avgInputTokens: 400, avgOutputTokens: 200, avgTtsChars: 150, pctWithTts: 100,
    },
    specs: ["STT Enhanced", "ElevenLabs Flash", "GPT-4.1", "~120s/conv"],
  },
  {
    id: "chatbot",
    name: "Chatbot Testuale",
    desc: "Chatbot senza ASR/TTS — solo LLM. Perfetto per chat web, WhatsApp, o canali testuali.",
    config: {
      conversations: 10000, avgDurationSec: 0, turnsPerConv: 5,
      asrModel: "google_asr_standard", ttsModel: "google_tts_standard", llmModel: "gemini_flash",
      avgInputTokens: 350, avgOutputTokens: 200, avgTtsChars: 0, pctWithTts: 0,
    },
    specs: ["Solo LLM", "Gemini Flash", "No ASR/TTS", "~5 turni"],
  },
  {
    id: "voicebot-elevenlabs-hd",
    name: "Voicebot HD",
    desc: "Massima qualità vocale con ElevenLabs Multilingual v2 e Gemini Flash. Ideale per demo e use case ad alto impatto.",
    config: {
      conversations: 5000, avgDurationSec: 120, turnsPerConv: 4,
      asrModel: "google_asr_enhanced", ttsModel: "elevenlabs_multi_v2", llmModel: "gemini_flash",
      avgInputTokens: 400, avgOutputTokens: 200, avgTtsChars: 150, pctWithTts: 100,
    },
    specs: ["STT Enhanced", "ElevenLabs v2", "Gemini Flash", "~120s/conv"],
  },
];

// ─── Default compare configurations ───
const DEFAULT_COMPARE_CONFIGS = [
  {
    label: "Gemini Flash + Google WaveNet",
    config: {
      avgDurationSec: 90, turnsPerConv: 3,
      asrModel: "google_asr_standard", ttsModel: "google_tts_wavenet", llmModel: "gemini_flash",
      avgInputTokens: 300, avgOutputTokens: 150, avgTtsChars: 120, pctWithTts: 100,
    },
  },
  {
    label: "Gemini Flash + ElevenLabs Flash 2.5",
    config: {
      avgDurationSec: 90, turnsPerConv: 3,
      asrModel: "google_asr_standard", ttsModel: "elevenlabs_flash_25", llmModel: "gemini_flash",
      avgInputTokens: 300, avgOutputTokens: 150, avgTtsChars: 120, pctWithTts: 100,
    },
  },
  {
    label: "GPT-4.1 + Google WaveNet",
    config: {
      avgDurationSec: 90, turnsPerConv: 3,
      asrModel: "google_asr_standard", ttsModel: "google_tts_wavenet", llmModel: "gpt41",
      avgInputTokens: 300, avgOutputTokens: 150, avgTtsChars: 120, pctWithTts: 100,
    },
  },
  {
    label: "GPT-4.1 + ElevenLabs Flash 2.5",
    config: {
      avgDurationSec: 90, turnsPerConv: 3,
      asrModel: "google_asr_standard", ttsModel: "elevenlabs_flash_25", llmModel: "gpt41",
      avgInputTokens: 300, avgOutputTokens: 150, avgTtsChars: 120, pctWithTts: 100,
    },
  },
];

// ─── Cost calculation engine ───
function calcCosts(config, prices) {
  const {
    conversations, avgDurationSec, turnsPerConv,
    asrModel, ttsModel, llmModel,
    avgInputTokens, avgOutputTokens, avgTtsChars, pctWithTts,
  } = config;

  const totalConv = conversations;

  // ASR Cost
  const totalAsrMinutes = (totalConv * avgDurationSec) / 60;
  const asrPricePerMin = prices[asrModel] || 0.024;
  const asrCost = avgDurationSec > 0 ? totalAsrMinutes * asrPricePerMin : 0;

  // TTS Cost
  const totalTtsChars = totalConv * turnsPerConv * avgTtsChars * (pctWithTts / 100);
  let ttsCost = 0;
  if (ttsModel.startsWith("google_tts_")) {
    const pricePerMillion = prices[ttsModel] || 4.0;
    ttsCost = (totalTtsChars / 1_000_000) * pricePerMillion;
  } else if (ttsModel.startsWith("elevenlabs_")) {
    const pricePerThousand = prices[ttsModel] || 0.06;
    ttsCost = (totalTtsChars / 1_000) * pricePerThousand;
  }

  // LLM Cost
  const totalInputTokens = totalConv * turnsPerConv * avgInputTokens;
  const totalOutputTokens = totalConv * turnsPerConv * avgOutputTokens;
  let llmInputPrice, llmOutputPrice;
  if (llmModel === "gemini_flash") {
    llmInputPrice = prices.gemini_flash_input;
    llmOutputPrice = prices.gemini_flash_output;
  } else {
    llmInputPrice = prices.gpt41_input;
    llmOutputPrice = prices.gpt41_output;
  }
  const llmCost =
    (totalInputTokens / 1_000_000) * llmInputPrice +
    (totalOutputTokens / 1_000_000) * llmOutputPrice;

  const totalCost = asrCost + ttsCost + llmCost;
  const costPerConv = totalConv > 0 ? totalCost / totalConv : 0;

  return {
    asrCost, ttsCost, llmCost, totalCost, costPerConv,
    totalAsrMinutes, totalTtsChars, totalInputTokens, totalOutputTokens,
  };
}

// ─── Metric box ───
function Metric({ label, value, sub, color }) {
  return (
    <div className="metric-box">
      <div className="metric-label">{label}</div>
      <div className={`metric-val ${color || ""}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

// ─── Breakdown bar ───
function BreakdownBar({ asr, tts, llm, total }) {
  if (total === 0) return null;
  const pA = (asr / total) * 100;
  const pT = (tts / total) * 100;
  const pL = (llm / total) * 100;
  return (
    <>
      <div className="breakdown-bar">
        {pA > 0 && <div style={{ width: `${pA}%`, background: COLORS.asr }}>{pA > 8 ? `${pA.toFixed(0)}%` : ""}</div>}
        {pT > 0 && <div style={{ width: `${pT}%`, background: COLORS.tts }}>{pT > 8 ? `${pT.toFixed(0)}%` : ""}</div>}
        {pL > 0 && <div style={{ width: `${pL}%`, background: COLORS.llm }}>{pL > 8 ? `${pL.toFixed(0)}%` : ""}</div>}
      </div>
      <div className="breakdown-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: COLORS.asr }} /> ASR — {fmtEur(asr)} ({pA.toFixed(1)}%)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: COLORS.tts }} /> TTS — {fmtEur(tts)} ({pT.toFixed(1)}%)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: COLORS.llm }} /> LLM — {fmtEur(llm)} ({pL.toFixed(1)}%)</div>
      </div>
    </>
  );
}

// ─── Result Panel ───
function ResultPanel({ results, config, markup }) {
  const {
    asrCost, ttsCost, llmCost, totalCost, costPerConv,
    totalAsrMinutes, totalTtsChars, totalInputTokens, totalOutputTokens,
  } = results;

  const periodMonths = config.periodMonths || 1;
  const periodLabel = periodMonths === 1 ? "/ mese" : `/ ${periodMonths} mesi`;
  const monthlyCost = periodMonths > 0 ? totalCost / periodMonths : totalCost;

  const hasMarkup = markup > 0;
  const sellingPrice = totalCost * (1 + markup / 100);
  const sellingPricePerConv = config.conversations > 0 ? sellingPrice / config.conversations : 0;
  const marginValue = sellingPrice - totalCost;

  return (
    <div className="result-panel">

      {/* API Cost */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
        <div className="result-total">{fmtEur(totalCost)}</div>
        <span style={{ fontSize: "14px", color: "var(--text-mid)" }}>costo API {periodLabel}</span>
      </div>
      <div className="result-sub">
        Costo per conversazione: <strong className="mono">{fmtEur(costPerConv)}</strong>
        &nbsp;&middot;&nbsp;{fmtInt(config.conversations)} conversazioni
        {periodMonths > 1 && (
          <>&nbsp;&middot;&nbsp;<strong className="mono">{fmtEur(monthlyCost)}</strong> / mese</>
        )}
      </div>

      {/* Selling price */}
      {hasMarkup && (
        <div className="selling-price-block">
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <div className="selling-price-total">{fmtEur(sellingPrice)}</div>
            <span className="selling-price-label">prezzo di vendita {periodLabel}</span>
          </div>
          <div className="selling-price-sub">
            <span>{fmtEur(sellingPricePerConv)} / conversazione</span>
            <span className="selling-margin-badge">+{markup}% ricarico &middot; margine {fmtEur(marginValue)}</span>
          </div>
        </div>
      )}

      <BreakdownBar asr={asrCost} tts={ttsCost} llm={llmCost} total={totalCost} />

      <div className="divider" />

      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)", marginBottom: "8px" }}>Dettaglio consumi</div>
      <div className="detail-row">
        <span className="detail-label">ASR — Minuti totali</span>
        <span className="detail-value">{fmtInt(Math.round(totalAsrMinutes))} min</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">TTS — Caratteri totali</span>
        <span className="detail-value">{fmtInt(Math.round(totalTtsChars))}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">LLM — Token input totali</span>
        <span className="detail-value">{fmtInt(totalInputTokens)}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">LLM — Token output totali</span>
        <span className="detail-value">{fmtInt(totalOutputTokens)}</span>
      </div>

      <div className="divider" />

      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)", marginBottom: "8px" }}>
        {hasMarkup ? "Stime estese — prezzo di vendita" : "Stime estese"}
        {periodMonths > 1 && <span style={{ fontWeight: 400, fontSize: "12px", color: "var(--text-light)", marginLeft: "8px" }}>(calcolate dal costo mensile: {fmtEur(hasMarkup ? monthlyCost * (1 + markup / 100) : monthlyCost)})</span>}
      </div>
      <div className="grid-3" style={{ marginBottom: "1rem" }}>
        <Metric
          label="Mensile"
          value={fmtEur(hasMarkup ? monthlyCost * (1 + markup / 100) : monthlyCost)}
          sub={hasMarkup ? `Costo: ${fmtEur(monthlyCost)}` : "1 mese"}
        />
        <Metric
          label="Semestrale"
          value={fmtEur((hasMarkup ? monthlyCost * (1 + markup / 100) : monthlyCost) * 6)}
          sub={hasMarkup ? `Costo: ${fmtEur(monthlyCost * 6)}` : "6 mesi"}
        />
        <Metric
          label="Annuale"
          value={fmtEur((hasMarkup ? monthlyCost * (1 + markup / 100) : monthlyCost) * 12)}
          sub={hasMarkup ? `Costo: ${fmtEur(monthlyCost * 12)}` : "12 mesi"}
          color="orange"
        />
      </div>

      {/* Print / export button */}
      <div className="print-btn-row no-print">
        <button className="btn-print" onClick={() => window.print()}>
          ⎙&nbsp; Esporta / Stampa PDF
        </button>
      </div>
    </div>
  );
}

// ─── Price Settings ───
function PriceSettings({ prices, setPrices }) {
  const [open, setOpen] = useState(false);

  const update = (key, val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) setPrices((prev) => ({ ...prev, [key]: num }));
  };

  const reset = () => setPrices({ ...DEFAULT_PRICES });

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <button className="settings-toggle" onClick={() => setOpen(!open)}>
        <span className="arrow" style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}>&#9662;</span>
        Configura listino prezzi
      </button>
      {open && (
        <div className="settings-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "12px", color: "var(--text-mid)" }}>I prezzi sono in USD. Modifica i valori per aggiornare la simulazione in tempo reale.</span>
            <button className="btn-outline" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={reset}>Reset default</button>
          </div>

          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--navy)", marginBottom: "8px" }}>ASR — Google Speech-to-Text ($/minuto)</div>
          <div className="settings-grid" style={{ marginBottom: "16px" }}>
            {Object.entries(ASR_MODELS).map(([key, label]) => (
              <div className="settings-item" key={key}>
                <div className="settings-item-label">{label}</div>
                <input className="form-input" type="number" step="0.001" min="0" value={prices[key]} onChange={(e) => update(key, e.target.value)} />
              </div>
            ))}
          </div>

          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--navy)", marginBottom: "8px" }}>TTS — Google ($/1M caratteri)</div>
          <div className="settings-grid" style={{ marginBottom: "16px" }}>
            {["google_tts_standard", "google_tts_wavenet", "google_tts_neural2", "google_tts_studio"].map((key) => (
              <div className="settings-item" key={key}>
                <div className="settings-item-label">{TTS_MODELS[key]}</div>
                <input className="form-input" type="number" step="0.1" min="0" value={prices[key]} onChange={(e) => update(key, e.target.value)} />
              </div>
            ))}
          </div>

          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--navy)", marginBottom: "8px" }}>TTS — ElevenLabs ($/1K caratteri)</div>
          <div className="settings-grid" style={{ marginBottom: "16px" }}>
            {["elevenlabs_flash_25", "elevenlabs_multi_v1", "elevenlabs_multi_v2"].map((key) => (
              <div className="settings-item" key={key}>
                <div className="settings-item-label">{TTS_MODELS[key]}</div>
                <input className="form-input" type="number" step="0.001" min="0" value={prices[key]} onChange={(e) => update(key, e.target.value)} />
              </div>
            ))}
          </div>

          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--navy)", marginBottom: "8px" }}>LLM ($/1M token)</div>
          <div className="settings-grid">
            <div className="settings-item">
              <div className="settings-item-label">Gemini 2.5 Flash — Input</div>
              <input className="form-input" type="number" step="0.01" min="0" value={prices.gemini_flash_input} onChange={(e) => update("gemini_flash_input", e.target.value)} />
            </div>
            <div className="settings-item">
              <div className="settings-item-label">Gemini 2.5 Flash — Output</div>
              <input className="form-input" type="number" step="0.01" min="0" value={prices.gemini_flash_output} onChange={(e) => update("gemini_flash_output", e.target.value)} />
            </div>
            <div className="settings-item">
              <div className="settings-item-label">GPT-4.1 — Input</div>
              <input className="form-input" type="number" step="0.01" min="0" value={prices.gpt41_input} onChange={(e) => update("gpt41_input", e.target.value)} />
            </div>
            <div className="settings-item">
              <div className="settings-item-label">GPT-4.1 — Output</div>
              <input className="form-input" type="number" step="0.01" min="0" value={prices.gpt41_output} onChange={(e) => update("gpt41_output", e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Markup / Ricarico bar ───
function MarkupBar({ markup, setMarkup }) {
  return (
    <div className="markup-bar no-print">
      <div className="markup-bar-left">
        <span className="markup-bar-title">Ricarico commerciale</span>
        <span className="markup-bar-hint">
          {markup === 0
            ? "Disattivo — mostra solo il costo API"
            : `Prezzo di vendita = costo × ${(1 + markup / 100).toFixed(2)} (+${markup}%)`}
        </span>
      </div>
      <div className="markup-bar-right">
        <input
          className="slider"
          type="range"
          min={0}
          max={200}
          step={5}
          value={markup}
          onChange={(e) => setMarkup(Number(e.target.value))}
        />
        <input
          className="form-input markup-input"
          type="number"
          min={0}
          max={500}
          step={5}
          value={markup}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v) && v >= 0) setMarkup(v);
          }}
        />
        <span className="markup-pct-label">%</span>
        {markup === 0 && <span className="markup-off-badge">OFF</span>}
      </div>
    </div>
  );
}

// ─── Quick Mode ───
function QuickMode({ prices, markup }) {
  const [selectedProfile, setSelectedProfile] = useState("voicebot-eco");
  const [conversations, setConversations] = useState(10000);

  const profile = PROFILES.find((p) => p.id === selectedProfile);
  const config = useMemo(() => ({ ...profile.config, conversations }), [profile, conversations]);
  const results = useMemo(() => calcCosts(config, prices), [config, prices]);

  return (
    <>
      <div className="section">
        <div className="section-title">Seleziona un profilo</div>
        <div className="section-desc">Scegli il tipo di soluzione per ottenere una stima rapida dei costi.</div>
        <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
          {PROFILES.map((p) => (
            <div
              key={p.id}
              className={`profile-card ${selectedProfile === p.id ? "selected" : ""}`}
              onClick={() => { setSelectedProfile(p.id); setConversations(p.config.conversations); }}
            >
              <div className="profile-name">{p.name}</div>
              <div className="profile-desc">{p.desc}</div>
              <div className="profile-specs">
                {p.specs.map((s, i) => (<span key={i} className="profile-spec">{s}</span>))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="form-group">
          <div className="form-label">Conversazioni al mese</div>
          <div className="slider-row">
            <input
              className="slider"
              type="range"
              min={500}
              max={200000}
              step={500}
              value={conversations}
              onChange={(e) => setConversations(Number(e.target.value))}
            />
            <span className="slider-val">{fmtInt(conversations)}</span>
          </div>
          <div className="form-hint">Trascina per regolare il volume mensile</div>
        </div>
      </div>

      <ResultPanel results={results} config={config} markup={markup} />

      <div className="callout" style={{ marginTop: "1rem" }}>
        <strong>Profilo: {profile.name}</strong> — {profile.desc}
      </div>
    </>
  );
}

// ─── AI System Prompt ───
const AI_SYSTEM_PROMPT = `Sei un esperto di AI conversazionale di Ellysse. Il tuo compito è analizzare la descrizione di uno scenario commerciale scritta in linguaggio naturale e trasformarla in uno o più scenari strutturati per il simulatore costi AI.

CONTESTO TECNICO:
- ASR (Speech-to-Text): Google STT. Modelli: "google_asr_standard" ($0.024/min), "google_asr_enhanced" ($0.036/min)
- TTS (Text-to-Speech): Google o ElevenLabs. Modelli: "google_tts_standard", "google_tts_wavenet", "google_tts_neural2", "google_tts_studio" (Chirp 3), "elevenlabs_flash_25", "elevenlabs_multi_v1", "elevenlabs_multi_v2"
- LLM: "gemini_flash" (Gemini 2.5 Flash), "gpt41" (GPT-4.1)

PARAMETRI PER OGNI SCENARIO:
- label: nome descrittivo dello scenario (es. "Bassa stagione — WaveNet — Prudente")
- periodMonths: numero di mesi coperti da questo scenario. CRUCIALE: se l'utente dice "60.000 chiamate in 7 mesi", periodMonths = 7 e conversations = 60000. Se dice "10.000 al mese", periodMonths = 1 e conversations = 10000.
- conversations: numero TOTALE di conversazioni nel periodo indicato (NON mensile, a meno che periodMonths = 1)
- avgDurationSec: durata media conversazione in secondi (default 90, 0 per chatbot)
- turnsPerConv: numero medio di turni bot per conversazione (default 3)
- asrModel: chiave del modello ASR (default "google_asr_standard")
- ttsModel: chiave del modello TTS
- llmModel: chiave del modello LLM (default "gemini_flash")
- avgInputTokens: token input medi per turno (default 300)
- avgOutputTokens: token output medi per turno (default 150)
- avgTtsChars: caratteri medi per risposta TTS (default 200, circa 30 parole)
- pctWithTts: percentuale conversazioni con TTS (default 100 per voicebot, 0 per chatbot)
- note: breve nota sul perché di questo scenario

REGOLE IMPORTANTI:

=== REGOLA CRITICA: FILTRAGGIO VOLUMI ===
Quando l'utente fornisce volumi grezzi (es. "45.000 chiamate/mese totali") e poi specifica filtri (es. "35% informative", "il bot gestisce il 60%"), DEVI applicare TUTTI i filtri in cascata per ottenere il numero di conversazioni effettivamente gestite dall'AI.

Esempio di calcolo corretto:
- 45.000 chiamate/mese totali
- 35% informative in bassa stagione = 15.750 informative/mese
- Bot gestisce il 60% = 9.450 gestite da AI/mese
- Per 7 mesi = 66.150 conversazioni AI in bassa stagione
- L'utente arrotonda a 60.000? Usa il valore indicato dall'utente.

Lo stesso vale per le sotto-divisioni (parchi, sedi, clienti): se l'utente fornisce il volume TOTALE annuale di un parco (es. "Oltremare 107.440"), quel numero rappresenta le chiamate totali grezze del parco, NON le conversazioni gestite da AI. Devi applicare gli stessi filtri (% informative × % automazione bot) anche a quei numeri, proporzionalmente.

Calcolo per sotto-divisione: il peso di ogni sotto-entità rispetto al totale è dato dal rapporto tra il suo volume e la somma di tutti i volumi. Usa quel peso per ripartire le conversazioni AI già calcolate a livello aggregato.
Esempio: se il totale annuale grezzo dei parchi è 543.746 e Oltremare ha 107.440 (19.75%), e le conversazioni AI totali annuali (scenario prudente) sono 160.000, allora Oltremare gestisce 160.000 × 19.75% = 31.600 conversazioni AI.

=== REGOLA ANTI-DOPPIO-CONTEGGIO ===
Gli scenari aggregati (totale annuale) e quelli per sotto-divisione (per parco/sede) rappresentano LO STESSO volume visto da prospettive diverse. NON devono essere sommati tra loro.
Per evitare confusione, usa il campo "group" per raggruppare gli scenari:
- group: "aggregato" per gli scenari totali (bassa stagione + alta stagione + totale annuale)
- group: "per_entita" per gli scenari suddivisi per parco/sede/cliente
Nella risposta JSON, aggiungi anche un campo "groups_note" nel summary che spiega: "Gli scenari 'per_entita' sono una suddivisione degli scenari 'aggregato'. I due gruppi NON vanno sommati."

=== ALTRE REGOLE ===
1. Se l'utente menziona scenari multipli (prudente/ottimista, bassa/alta stagione), crea scenari SEPARATI per ciascuna combinazione.
2. Se l'utente menziona comparazioni TTS (es. WaveNet vs Chirp 3), duplica gli scenari per ogni modello TTS.
3. Se l'utente menziona sotto-divisioni (parchi, sedi, clienti), crea scenari per ogni sotto-divisione applicando il filtro proporzionale come descritto sopra.
4. Il campo "conversations" deve essere il numero di conversazioni EFFETTIVAMENTE GESTITE DALL'AI dopo tutti i filtri, NON il volume grezzo.
5. Se l'utente parla di "60.000 chiamate in 7 mesi gestite dall'AI", conversations = 60000 e periodMonths = 7. Se dice "10.000 al mese", conversations = 10000 e periodMonths = 1.
6. Se l'utente non specifica durata, turni o token, usa i default ragionevoli sopra indicati.
7. Aggiungi sempre un campo "period" (es. "7 mesi bassa stagione", "5 mesi alta stagione", "12 mesi") per chiarire il periodo coperto.
8. Per le sotto-divisioni, gli scenari per entità devono coprire lo stesso arco temporale (12 mesi) e la somma delle loro conversazioni deve corrispondere al totale annuale dello scenario corrispondente.

RISPONDI ESCLUSIVAMENTE con un JSON valido in questo formato, senza testo prima o dopo:
{
  "summary": "Breve riepilogo di cosa hai capito dalla richiesta (2-3 frasi in italiano). Se ci sono sotto-divisioni, SPECIFICA che gli scenari per entità sono una ripartizione del totale e NON vanno sommati agli aggregati.",
  "scenarios": [
    {
      "group": "aggregato",
      "label": "Bassa stagione - Prudente - WaveNet",
      "period": "7 mesi bassa stagione",
      "periodMonths": 7,
      "conversations": 60000,
      "avgDurationSec": 90,
      "turnsPerConv": 3,
      "asrModel": "google_asr_standard",
      "ttsModel": "google_tts_wavenet",
      "llmModel": "gemini_flash",
      "avgInputTokens": 300,
      "avgOutputTokens": 150,
      "avgTtsChars": 200,
      "pctWithTts": 100,
      "note": "60.000 conv. = 100.000 informative × 60% automazione"
    },
    {
      "group": "per_entita",
      "label": "Oltremare - Annuale Prudente - WaveNet",
      "period": "12 mesi",
      "periodMonths": 12,
      "conversations": 31600,
      "avgDurationSec": 90,
      "turnsPerConv": 3,
      "asrModel": "google_asr_standard",
      "ttsModel": "google_tts_wavenet",
      "llmModel": "gemini_flash",
      "avgInputTokens": 300,
      "avgOutputTokens": 150,
      "avgTtsChars": 200,
      "pctWithTts": 100,
      "note": "19.75% del totale 160.000 (peso: 107.440/543.746)"
    }
  ]
}`;

// ─── AI Assistant Component ───
function AiAssistant({ prices, markup, onLoadScenario }) {
  const [apiKey, setApiKey] = useState(() => {
    try { return window.localStorage.getItem("ellysse_ai_key") || ""; } catch { return ""; }
  });
  const [keyVisible, setKeyVisible] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");
  const resultRef = useRef(null);

  // persist key
  useEffect(() => {
    try { if (apiKey) window.localStorage.setItem("ellysse_ai_key", apiKey); } catch {}
  }, [apiKey]);

  const analyze = async () => {
    if (!prompt.trim() || !apiKey.trim()) return;
    setLoading(true);
    setError("");
    setAiResult(null);

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: AI_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          max_tokens: 8000,
          temperature: 0.1,
        }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        setError(data.error?.message || "Nessuna risposta dal modello.");
        setLoading(false);
        return;
      }

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      // Also try to find raw JSON object
      const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (braceMatch) jsonStr = braceMatch[0];

      const parsed = JSON.parse(jsonStr);

      if (!parsed.scenarios || !Array.isArray(parsed.scenarios)) {
        setError("L'AI non ha prodotto scenari validi. Riprova con una descrizione più dettagliata.");
        setLoading(false);
        return;
      }

      // Calculate costs for each scenario
      const withCosts = parsed.scenarios.map((s) => {
        const cfg = {
          conversations: s.conversations || 0,
          avgDurationSec: s.avgDurationSec ?? 90,
          turnsPerConv: s.turnsPerConv ?? 3,
          asrModel: s.asrModel || "google_asr_standard",
          ttsModel: s.ttsModel || "google_tts_wavenet",
          llmModel: s.llmModel || "gemini_flash",
          avgInputTokens: s.avgInputTokens ?? 300,
          avgOutputTokens: s.avgOutputTokens ?? 150,
          avgTtsChars: s.avgTtsChars ?? 200,
          pctWithTts: s.pctWithTts ?? 100,
          periodMonths: s.periodMonths ?? 1,
        };
        return { ...s, _config: cfg, results: calcCosts(cfg, prices) };
      });

      // Detect groups for anti-double-counting
      const groups = {};
      withCosts.forEach((s) => {
        const g = s.group || "aggregato";
        if (!groups[g]) groups[g] = [];
        groups[g].push(s);
      });
      const hasMultipleGroups = Object.keys(groups).length > 1;
      const groupTotals = {};
      for (const [g, scenarios] of Object.entries(groups)) {
        const total = scenarios.reduce((acc, s) => acc + s.results.totalCost, 0);
        const monthly = scenarios.reduce((acc, s) => {
          const pm = s._config.periodMonths || 1;
          return acc + s.results.totalCost / pm;
        }, 0);
        groupTotals[g] = { total, monthly, count: scenarios.length };
      }
      // Grand total uses only "aggregato" group to avoid double-counting
      const primaryGroup = groups["aggregato"] || Object.values(groups)[0] || [];
      const grandTotal = primaryGroup.reduce((acc, s) => acc + s.results.totalCost, 0);
      const grandTotalMonthly = primaryGroup.reduce((acc, s) => {
        const pm = s._config.periodMonths || 1;
        return acc + s.results.totalCost / pm;
      }, 0);

      setAiResult({ summary: parsed.summary, scenarios: withCosts, groups, groupTotals, hasMultipleGroups, grandTotal, grandTotalMonthly });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("L'AI ha risposto in un formato non valido. Riprova.");
      } else {
        setError(`Errore: ${err.message}`);
      }
    }
    setLoading(false);
  };

  const examplePrompts = [
    "45.000 chiamate/mese, 35% informative in bassa stagione (7 mesi), 90% in alta (5 mesi). Bot gestisce il 60% in autonomia. Confronta WaveNet vs Chirp 3.",
    "10.000 conversazioni/mese con voicebot, durata media 2 minuti, 3 turni. Confronta Gemini Flash vs GPT-4.1 con ElevenLabs Flash.",
    "Chatbot testuale WhatsApp, 20.000 messaggi/mese, 5 turni per conversazione. Solo Gemini Flash.",
  ];

  return (
    <div className="ai-assistant">
      <div className="ai-assistant-header">
        <div className="ai-assistant-icon">✦</div>
        <div>
          <div className="ai-assistant-title">Assistente AI</div>
          <div className="ai-assistant-subtitle">Descrivi lo scenario in linguaggio naturale — l'AI compilerà tutto per te</div>
        </div>
      </div>

      {/* API Key */}
      <div className="ai-key-row">
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <div className="form-label" style={{ fontSize: "11px" }}>API Key OpenRouter</div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              className="form-input"
              type={keyVisible ? "text" : "password"}
              placeholder="sk-or-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ fontSize: "12px" }}
            />
            <button
              className="btn-outline"
              style={{ padding: "6px 10px", fontSize: "11px", flexShrink: 0 }}
              onClick={() => setKeyVisible(!keyVisible)}
            >
              {keyVisible ? "Nascondi" : "Mostra"}
            </button>
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div className="form-group" style={{ marginBottom: "10px" }}>
        <div className="form-label">Descrivi lo scenario</div>
        <textarea
          className="ai-textarea"
          rows={6}
          placeholder={"Incolla qui la descrizione dello scenario commerciale...\n\nEsempio: 45.000 chiamate/mese, 35% informative in bassa stagione (7 mesi), 90% in alta stagione (5 mesi). Il bot gestisce il 60% in autonomia (scenario prudente) o 70% (ottimista). Confronta WaveNet vs Chirp 3. Suddividi per parco: Cattolica 103.457, Cway 182.922, ..."}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Example chips */}
      {!prompt && (
        <div className="ai-examples">
          <span style={{ fontSize: "11px", color: "var(--text-light)", marginRight: "4px" }}>Esempi:</span>
          {examplePrompts.map((ex, i) => (
            <button key={i} className="ai-example-chip" onClick={() => setPrompt(ex)}>
              {ex.slice(0, 60)}…
            </button>
          ))}
        </div>
      )}

      {/* Analyze button */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px" }}>
        <button
          className="btn-primary ai-analyze-btn"
          onClick={analyze}
          disabled={loading || !prompt.trim() || !apiKey.trim()}
          style={{ opacity: loading || !prompt.trim() || !apiKey.trim() ? 0.5 : 1 }}
        >
          {loading ? (
            <span className="ai-spinner">Analizzo lo scenario…</span>
          ) : (
            <>✦ Analizza con AI</>
          )}
        </button>
        {aiResult && (
          <button className="btn-outline" style={{ fontSize: "12px", padding: "8px 14px" }} onClick={() => { setAiResult(null); setPrompt(""); }}>
            ↺ Nuova analisi
          </button>
        )}
      </div>

      {/* Error */}
      {error && <div className="ai-error">{error}</div>}

      {/* Results */}
      {aiResult && (
        <div className="ai-results" ref={resultRef}>
          {/* Summary */}
          <div className="ai-summary">
            <div className="ai-summary-label">Interpretazione AI</div>
            <div className="ai-summary-text">{aiResult.summary}</div>
          </div>

          {/* Grand total */}
          <div className="ai-grand-total">
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-mid)", marginBottom: "2px" }}>
                {aiResult.hasMultipleGroups
                  ? "Costo API totale — solo scenari aggregati (no dettaglio per entità)"
                  : "Costo API totale — somma di tutti gli scenari"}
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--navy)" }}>
                {fmtEur(aiResult.grandTotal)}
              </div>
              {markup > 0 && (
                <div style={{ fontSize: "14px", color: "var(--orange)", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>
                  Vendita: {fmtEur(aiResult.grandTotal * (1 + markup / 100))} (+{markup}%)
                </div>
              )}
              <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
                Media mensile stimata: {fmtEur(aiResult.grandTotalMonthly)} — Annualizzato: {fmtEur(aiResult.grandTotalMonthly * 12)}
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-light)" }}>
              {aiResult.scenarios.length} scenari generati
            </div>
          </div>

          {/* Anti-double-counting warning */}
          {aiResult.hasMultipleGroups && (
            <div style={{
              background: "linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)",
              border: "1px solid #ffc107",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              fontSize: "12px",
              lineHeight: 1.5,
              color: "#856404",
            }}>
              <strong>⚠ Attenzione — Gruppi multipli rilevati</strong><br/>
              Gli scenari "per entità" (dettaglio per parco/sede) rappresentano una <strong>suddivisione proporzionale</strong> del totale aggregato,
              NON costi aggiuntivi. Il totale sopra considera solo gli scenari aggregati.
              {aiResult.groupTotals && Object.entries(aiResult.groupTotals).map(([g, gt]) => (
                <div key={g} style={{ marginTop: "6px" }}>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{g.replace("_", " ")}:</span>{" "}
                  {fmtEur(gt.total)} ({gt.count} scenari)
                </div>
              ))}
            </div>
          )}

          {/* Scenario cards — grouped */}
          {aiResult.hasMultipleGroups ? (
            Object.entries(aiResult.groups).map(([groupName, groupScenarios]) => (
              <div key={groupName} style={{ marginBottom: "24px" }}>
                <div style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: groupName === "aggregato" ? "var(--navy)" : "var(--text-mid)",
                  borderBottom: groupName === "aggregato" ? "2px solid var(--navy)" : "1px solid var(--border)",
                  paddingBottom: "6px",
                  marginBottom: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}>
                  <span>{groupName === "aggregato" ? "📊 Scenari Aggregati (usati per il totale)" : `📋 Dettaglio: ${groupName.replace("_", " ")}`}</span>
                  <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-light)" }}>
                    {fmtEur(aiResult.groupTotals[groupName]?.total || 0)}
                  </span>
                </div>
                <div className="ai-scenarios-grid">
                  {groupScenarios.map((s, i) => {
                    const sellingPrice = s.results.totalCost * (1 + markup / 100);
                    const pm = s._config?.periodMonths || s.periodMonths || 1;
                    const monthlyCost = pm > 0 ? s.results.totalCost / pm : s.results.totalCost;
                    const periodLabel = pm === 1 ? "/ mese" : `/ ${pm} mesi`;
                    return (
                      <div key={i} className="ai-scenario-card" style={groupName !== "aggregato" ? { opacity: 0.85, borderLeftColor: "var(--text-light)" } : {}}>
                        <div className="ai-scenario-header">
                          <div>
                            <div className="ai-scenario-label">{s.label}</div>
                            {s.period && <div className="ai-scenario-period">{s.period}</div>}
                          </div>
                          <button
                            className="btn-card-edit"
                            title="Carica nei campi della simulazione dettagliata"
                            onClick={() => onLoadScenario && onLoadScenario({
                              conversations: s.conversations, avgDurationSec: s.avgDurationSec ?? 90, turnsPerConv: s.turnsPerConv ?? 3,
                              asrModel: s.asrModel || "google_asr_standard", ttsModel: s.ttsModel || "google_tts_wavenet", llmModel: s.llmModel || "gemini_flash",
                              avgInputTokens: s.avgInputTokens ?? 300, avgOutputTokens: s.avgOutputTokens ?? 150, avgTtsChars: s.avgTtsChars ?? 200,
                              pctWithTts: s.pctWithTts ?? 100, periodMonths: pm, label: s.label,
                            })}
                          >↓ Carica nel form</button>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "2px" }}>
                          <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--navy)" }}>
                            {fmtEur(s.results.totalCost)}
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-light)" }}>costo API {periodLabel}</span>
                        </div>
                        {pm > 1 && (
                          <div style={{ fontSize: "12px", color: "var(--text-mid)", fontFamily: "'JetBrains Mono', monospace", marginBottom: "2px" }}>
                            {fmtEur(monthlyCost)} / mese
                          </div>
                        )}
                        {markup > 0 && (
                          <div style={{ fontSize: "13px", color: "var(--orange)", fontFamily: "'JetBrains Mono', monospace", marginBottom: "6px" }}>
                            Vendita: {fmtEur(sellingPrice)} {periodLabel}
                          </div>
                        )}
                        <div style={{ fontSize: "12px", color: "var(--text-mid)", marginBottom: "8px" }}>
                          {fmtInt(s.conversations)} conv. in {pm} {pm === 1 ? "mese" : "mesi"} &middot; {fmtEur(s.results.costPerConv)}/conv
                        </div>
                        <BreakdownBar asr={s.results.asrCost} tts={s.results.ttsCost} llm={s.results.llmCost} total={s.results.totalCost} />
                        <div className="detail-row" style={{ fontSize: "12px" }}>
                          <span className="detail-label">ASR</span>
                          <span className="detail-value" style={{ fontSize: "12px" }}>{fmtEur(s.results.asrCost)}</span>
                        </div>
                        <div className="detail-row" style={{ fontSize: "12px" }}>
                          <span className="detail-label">TTS ({TTS_MODELS[s.ttsModel] || s.ttsModel})</span>
                          <span className="detail-value" style={{ fontSize: "12px" }}>{fmtEur(s.results.ttsCost)}</span>
                        </div>
                        <div className="detail-row" style={{ fontSize: "12px" }}>
                          <span className="detail-label">LLM ({LLM_MODELS[s.llmModel] || s.llmModel})</span>
                          <span className="detail-value" style={{ fontSize: "12px" }}>{fmtEur(s.results.llmCost)}</span>
                        </div>
                        {s.note && <div className="ai-scenario-note">{s.note}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
          <div className="ai-scenarios-grid">
            {aiResult.scenarios.map((s, i) => {
              const sellingPrice = s.results.totalCost * (1 + markup / 100);
              const pm = s._config?.periodMonths || s.periodMonths || 1;
              const monthlyCost = pm > 0 ? s.results.totalCost / pm : s.results.totalCost;
              const periodLabel = pm === 1 ? "/ mese" : `/ ${pm} mesi`;
              return (
                <div key={i} className="ai-scenario-card">
                  <div className="ai-scenario-header">
                    <div>
                      <div className="ai-scenario-label">{s.label}</div>
                      {s.period && <div className="ai-scenario-period">{s.period}</div>}
                    </div>
                    <button
                      className="btn-card-edit"
                      title="Carica nei campi della simulazione dettagliata"
                      onClick={() => onLoadScenario && onLoadScenario({
                        conversations: s.conversations,
                        avgDurationSec: s.avgDurationSec ?? 90,
                        turnsPerConv: s.turnsPerConv ?? 3,
                        asrModel: s.asrModel || "google_asr_standard",
                        ttsModel: s.ttsModel || "google_tts_wavenet",
                        llmModel: s.llmModel || "gemini_flash",
                        avgInputTokens: s.avgInputTokens ?? 300,
                        avgOutputTokens: s.avgOutputTokens ?? 150,
                        avgTtsChars: s.avgTtsChars ?? 200,
                        pctWithTts: s.pctWithTts ?? 100,
                        periodMonths: pm,
                        label: s.label,
                      })}
                    >
                      ↓ Carica nel form
                    </button>
                  </div>

                  {/* Costs */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "22px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--navy)" }}>
                      {fmtEur(s.results.totalCost)}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-light)" }}>costo API {periodLabel}</span>
                  </div>
                  {pm > 1 && (
                    <div style={{ fontSize: "12px", color: "var(--text-mid)", fontFamily: "'JetBrains Mono', monospace", marginBottom: "2px" }}>
                      {fmtEur(monthlyCost)} / mese
                    </div>
                  )}
                  {markup > 0 && (
                    <div style={{ fontSize: "13px", color: "var(--orange)", fontFamily: "'JetBrains Mono', monospace", marginBottom: "6px" }}>
                      Vendita: {fmtEur(sellingPrice)} {periodLabel}
                    </div>
                  )}

                  <div style={{ fontSize: "12px", color: "var(--text-mid)", marginBottom: "8px" }}>
                    {fmtInt(s.conversations)} conv. in {pm} {pm === 1 ? "mese" : "mesi"} &middot; {fmtEur(s.results.costPerConv)}/conv
                  </div>

                  <BreakdownBar asr={s.results.asrCost} tts={s.results.ttsCost} llm={s.results.llmCost} total={s.results.totalCost} />

                  {/* Details */}
                  <div className="detail-row" style={{ fontSize: "12px" }}>
                    <span className="detail-label">ASR</span>
                    <span className="detail-value" style={{ fontSize: "12px" }}>{fmtEur(s.results.asrCost)}</span>
                  </div>
                  <div className="detail-row" style={{ fontSize: "12px" }}>
                    <span className="detail-label">TTS ({TTS_MODELS[s.ttsModel] || s.ttsModel})</span>
                    <span className="detail-value" style={{ fontSize: "12px" }}>{fmtEur(s.results.ttsCost)}</span>
                  </div>
                  <div className="detail-row" style={{ fontSize: "12px" }}>
                    <span className="detail-label">LLM ({LLM_MODELS[s.llmModel] || s.llmModel})</span>
                    <span className="detail-value" style={{ fontSize: "12px" }}>{fmtEur(s.results.llmCost)}</span>
                  </div>

                  {/* Note */}
                  {s.note && (
                    <div className="ai-scenario-note">{s.note}</div>
                  )}
                </div>
              );
            })}
          </div>
          )}

          {/* Print */}
          <div className="print-btn-row no-print" style={{ marginTop: "1rem" }}>
            <button className="btn-print" onClick={() => window.print()}>
              ⎙&nbsp; Esporta / Stampa PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Advanced Mode ───
function AdvancedMode({ prices, markup }) {
  const [config, setConfig] = useState({
    conversations: 10000, avgDurationSec: 90, turnsPerConv: 3,
    asrModel: "google_asr_standard", ttsModel: "google_tts_wavenet", llmModel: "gemini_flash",
    avgInputTokens: 300, avgOutputTokens: 150, avgTtsChars: 120, pctWithTts: 100,
    periodMonths: 1,
  });

  const [customPeriod, setCustomPeriod] = useState(false);
  const [loadedLabel, setLoadedLabel] = useState("");
  const formRef = useRef(null);

  const update = useCallback((key, val) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleLoadScenario = useCallback((scenario) => {
    const { label, ...cfg } = scenario;
    setConfig((prev) => ({ ...prev, ...cfg }));
    setLoadedLabel(label || "Scenario AI");
    // If period is not in the preset options, switch to custom
    const isPreset = PERIOD_OPTIONS.some((o) => o.value === cfg.periodMonths && o.value !== 0);
    setCustomPeriod(!isPreset);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }, []);

  const results = useMemo(() => calcCosts(config, prices), [config, prices]);

  return (
    <>
      {/* AI Assistant */}
      <AiAssistant prices={prices} markup={markup} onLoadScenario={handleLoadScenario} />

      <div className="divider" />

      <div className="section" ref={formRef}>
        <div className="section-title">
          Parametri conversazione
          {loadedLabel && <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--orange)", marginLeft: "10px" }}>← caricato da: {loadedLabel}</span>}
        </div>
        <div className="section-desc">Configura ogni dettaglio per una stima precisa, utile per capitolati tecnici e preventivi dettagliati.</div>

        <div className="grid-3" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <div className="form-label">Conversazioni totali nel periodo</div>
            <input className="form-input" type="number" min={0} value={config.conversations} onChange={(e) => update("conversations", Number(e.target.value))} />
          </div>
          <div className="form-group">
            <div className="form-label">Periodo di riferimento</div>
            <select
              className="form-select"
              value={customPeriod ? 0 : config.periodMonths}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v === 0) {
                  setCustomPeriod(true);
                } else {
                  setCustomPeriod(false);
                  update("periodMonths", v);
                }
              }}
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {customPeriod && (
              <input
                className="form-input"
                type="number"
                min={1}
                max={120}
                placeholder="N. mesi"
                style={{ marginTop: "6px" }}
                value={config.periodMonths}
                onChange={(e) => update("periodMonths", Math.max(1, Number(e.target.value)))}
              />
            )}
            <div className="form-hint">Le conversazioni si riferiscono a questo periodo</div>
          </div>
          <div className="form-group">
            <div className="form-label">Durata media conversazione (sec)</div>
            <input className="form-input" type="number" min={0} value={config.avgDurationSec} onChange={(e) => update("avgDurationSec", Number(e.target.value))} />
            <div className="form-hint">0 = nessun ASR (chatbot testuale)</div>
          </div>
        </div>

        <div className="grid-3" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <div className="form-label">Turni per conversazione</div>
            <input className="form-input" type="number" min={1} value={config.turnsPerConv} onChange={(e) => update("turnsPerConv", Number(e.target.value))} />
            <div className="form-hint">Scambi utente-bot per sessione</div>
          </div>
          <div className="form-group">
            <div className="form-label">Token input medi / turno</div>
            <input className="form-input" type="number" min={0} value={config.avgInputTokens} onChange={(e) => update("avgInputTokens", Number(e.target.value))} />
            <div className="form-hint">Prompt + contesto inviati al LLM</div>
          </div>
          <div className="form-group">
            <div className="form-label">Token output medi / turno</div>
            <input className="form-input" type="number" min={0} value={config.avgOutputTokens} onChange={(e) => update("avgOutputTokens", Number(e.target.value))} />
            <div className="form-hint">Risposta generata dal LLM</div>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="section">
        <div className="section-title">Modelli</div>
        <div className="grid-3" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <div className="form-label">ASR (Speech-to-Text)</div>
            <select className="form-select" value={config.asrModel} onChange={(e) => update("asrModel", e.target.value)}>
              {Object.entries(ASR_MODELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">TTS (Text-to-Speech)</div>
            <select className="form-select" value={config.ttsModel} onChange={(e) => update("ttsModel", e.target.value)}>
              {Object.entries(TTS_MODELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
          <div className="form-group">
            <div className="form-label">LLM</div>
            <select className="form-select" value={config.llmModel} onChange={(e) => update("llmModel", e.target.value)}>
              {Object.entries(LLM_MODELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="section">
        <div className="section-title">TTS — Dettaglio</div>
        <div className="grid-2" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <div className="form-label">Caratteri medi per risposta TTS</div>
            <input className="form-input" type="number" min={0} value={config.avgTtsChars} onChange={(e) => update("avgTtsChars", Number(e.target.value))} />
            <div className="form-hint">Lunghezza media del testo sintetizzato</div>
          </div>
          <div className="form-group">
            <div className="form-label">% conversazioni con TTS</div>
            <div className="slider-row">
              <input
                className="slider"
                type="range"
                min={0}
                max={100}
                step={5}
                value={config.pctWithTts}
                onChange={(e) => update("pctWithTts", Number(e.target.value))}
              />
              <span className="slider-val">{config.pctWithTts}%</span>
            </div>
            <div className="form-hint">0% = chatbot testuale, 100% = voicebot completo</div>
          </div>
        </div>
      </div>

      <ResultPanel results={results} config={config} markup={markup} />

      <div className="callout-orange callout" style={{ marginTop: "1rem" }}>
        <strong>Nota per il capitolato:</strong> i prezzi sono basati sui listini pubblici delle API al momento della simulazione (marzo 2026). I costi effettivi possono variare in base al volume e agli accordi commerciali con i provider. I free tier non sono considerati nella stima.
      </div>
    </>
  );
}

// ─── Compare Mode — fully customizable ───
function CompareMode({ prices, markup }) {
  const [configs, setConfigs] = useState(DEFAULT_COMPARE_CONFIGS);
  const [conversations, setConversations] = useState(10000);
  const [editingIdx, setEditingIdx] = useState(null);

  const updateConfigField = useCallback((idx, field, value) => {
    setConfigs((prev) =>
      prev.map((c, i) =>
        i !== idx
          ? c
          : field === "label"
          ? { ...c, label: value }
          : { ...c, config: { ...c.config, [field]: value } }
      )
    );
  }, []);

  const resetConfigs = () => {
    setConfigs(DEFAULT_COMPARE_CONFIGS);
    setEditingIdx(null);
  };

  const results = useMemo(
    () =>
      configs.map((c) => ({
        ...c,
        results: calcCosts({ ...c.config, conversations }, prices),
      })),
    [configs, conversations, prices]
  );

  const minCost = Math.min(...results.map((r) => r.results.totalCost));

  return (
    <>
      <div className="section">
        <div className="section-title">Confronto configurazioni</div>
        <div className="section-desc">
          Quattro configurazioni a confronto sullo stesso volume. Clicca <strong>✎ Modifica</strong> su qualsiasi card per personalizzare modelli e parametri in tempo reale.
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div className="form-group" style={{ flex: 1, minWidth: 240, marginBottom: 0 }}>
            <div className="form-label">Conversazioni / mese (uguale per tutte le configurazioni)</div>
            <div className="slider-row">
              <input
                className="slider"
                type="range"
                min={500}
                max={200000}
                step={500}
                value={conversations}
                onChange={(e) => setConversations(Number(e.target.value))}
              />
              <span className="slider-val">{fmtInt(conversations)}</span>
            </div>
          </div>
          <button
            className="btn-outline no-print"
            style={{ padding: "8px 14px", fontSize: "12px" }}
            onClick={resetConfigs}
          >
            ↺ Reset
          </button>
          <button
            className="btn-print no-print"
            style={{ padding: "8px 14px" }}
            onClick={() => window.print()}
          >
            ⎙ Esporta PDF
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        {results.map((r, i) => {
          const isCheapest = r.results.totalCost === minCost;
          const isEditing = editingIdx === i;
          const sellingPrice = r.results.totalCost * (1 + markup / 100);

          return (
            <div
              key={i}
              className="card"
              style={{ borderLeft: `4px solid ${isCheapest ? "var(--green)" : "var(--pale-navy)"}` }}
            >
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                {isEditing ? (
                  <input
                    className="form-input"
                    style={{ fontSize: "13px", fontWeight: 600, flex: 1 }}
                    value={r.label}
                    onChange={(e) => updateConfigField(i, "label", e.target.value)}
                    placeholder="Nome configurazione"
                  />
                ) : (
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)", flex: 1 }}>
                    {r.label}
                    {isCheapest && (
                      <span style={{ marginLeft: "8px", fontSize: "10px", color: "var(--green)", fontFamily: "'JetBrains Mono', monospace" }}>
                        PIÙ CONV.
                      </span>
                    )}
                  </div>
                )}
                <button
                  className="btn-card-edit no-print"
                  onClick={() => setEditingIdx(isEditing ? null : i)}
                >
                  {isEditing ? "✓ Chiudi" : "✎ Modifica"}
                </button>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="compare-edit-form">
                  <div className="grid-3" style={{ marginBottom: "8px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">ASR</div>
                      <select className="form-select" value={r.config.asrModel} onChange={(e) => updateConfigField(i, "asrModel", e.target.value)}>
                        {Object.entries(ASR_MODELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">TTS</div>
                      <select className="form-select" value={r.config.ttsModel} onChange={(e) => updateConfigField(i, "ttsModel", e.target.value)}>
                        {Object.entries(TTS_MODELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">LLM</div>
                      <select className="form-select" value={r.config.llmModel} onChange={(e) => updateConfigField(i, "llmModel", e.target.value)}>
                        {Object.entries(LLM_MODELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid-3" style={{ marginBottom: "8px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">Durata (sec)</div>
                      <input className="form-input" type="number" min={0} value={r.config.avgDurationSec} onChange={(e) => updateConfigField(i, "avgDurationSec", Number(e.target.value))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">Turni / conv</div>
                      <input className="form-input" type="number" min={1} value={r.config.turnsPerConv} onChange={(e) => updateConfigField(i, "turnsPerConv", Number(e.target.value))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">% con TTS</div>
                      <input className="form-input" type="number" min={0} max={100} value={r.config.pctWithTts} onChange={(e) => updateConfigField(i, "pctWithTts", Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="grid-3" style={{ marginBottom: "12px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">Token input / turno</div>
                      <input className="form-input" type="number" min={0} value={r.config.avgInputTokens} onChange={(e) => updateConfigField(i, "avgInputTokens", Number(e.target.value))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">Token output / turno</div>
                      <input className="form-input" type="number" min={0} value={r.config.avgOutputTokens} onChange={(e) => updateConfigField(i, "avgOutputTokens", Number(e.target.value))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div className="form-label">Char TTS / risposta</div>
                      <input className="form-input" type="number" min={0} value={r.config.avgTtsChars} onChange={(e) => updateConfigField(i, "avgTtsChars", Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              )}

              {/* Cost */}
              <div style={{ fontSize: "26px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: isCheapest ? "var(--green)" : "var(--navy)" }}>
                {fmtEur(r.results.totalCost)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-mid)", marginBottom: markup > 0 ? "6px" : "10px" }}>
                {fmtEur(r.results.costPerConv)} / conversazione — costo API
              </div>

              {/* Selling price */}
              {markup > 0 && (
                <div className="compare-selling-price">
                  <span className="compare-selling-value">{fmtEur(sellingPrice)}</span>
                  <span className="compare-selling-label">prezzo vendita (+{markup}%)</span>
                </div>
              )}

              <BreakdownBar
                asr={r.results.asrCost}
                tts={r.results.ttsCost}
                llm={r.results.llmCost}
                total={r.results.totalCost}
              />

              <div className="detail-row">
                <span className="detail-label">ASR</span>
                <span className="detail-value">{fmtEur(r.results.asrCost)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">TTS</span>
                <span className="detail-value">{fmtEur(r.results.ttsCost)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">LLM</span>
                <span className="detail-value">{fmtEur(r.results.llmCost)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="callout">
        <strong>Come usare il confronto:</strong> usa <em>✎ Modifica</em> per cambiare modelli, durata, turni, token e caratteri TTS per ciascuna configurazione. Il volume mensile è condiviso. Clicca <em>⎙ Esporta PDF</em> per stampare o salvare il confronto.
      </div>
    </>
  );
}

// ─── Main App ───
export default function App() {
  const [mode, setMode] = useState("quick");
  const [prices, setPrices] = useState({ ...DEFAULT_PRICES });
  const [markup, setMarkup] = useState(30);

  return (
    <div>
      {/* HERO */}
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-tag">ELLYSSE — SIMULATORE COSTI AI</div>
          <h1>Simulatore costi AI</h1>
          <p className="hero-sub">
            Strumento interattivo per stimare i costi di ASR, TTS e LLM nei progetti di AI conversazionale.
            Pensato per i commerciali di Ellysse e per la preparazione di capitolati tecnici.
          </p>
        </div>
      </div>

      <div className="main-wrap">
        {/* Mode tabs */}
        <div className="mode-tabs no-print">
          <button className={`mode-tab ${mode === "quick" ? "active" : ""}`} onClick={() => setMode("quick")}>
            Stima rapida
          </button>
          <button className={`mode-tab ${mode === "advanced" ? "active" : ""}`} onClick={() => setMode("advanced")}>
            Simulazione dettagliata
          </button>
          <button className={`mode-tab ${mode === "compare" ? "active" : ""}`} onClick={() => setMode("compare")}>
            Confronto modelli
          </button>
        </div>

        {/* Price settings */}
        <PriceSettings prices={prices} setPrices={setPrices} />

        {/* Markup / Ricarico bar */}
        <MarkupBar markup={markup} setMarkup={setMarkup} />

        <div className="divider" />

        {/* Content */}
        {mode === "quick" && <QuickMode prices={prices} markup={markup} />}
        {mode === "advanced" && <AdvancedMode prices={prices} markup={markup} />}
        {mode === "compare" && <CompareMode prices={prices} markup={markup} />}
      </div>

      {/* FOOTER */}
      <div className="footer">
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>
          <span className="mono" style={{ fontSize: "11px" }}>ELLYSSE</span> — Simulatore Costi AI &middot; Prezzi aggiornati a marzo 2026
          <br />
          <span style={{ fontSize: "11px", opacity: 0.7 }}>I costi sono stime basate sui listini pubblici. Free tier e sconti volume non inclusi.</span>
        </div>
      </div>
    </div>
  );
}
