import { useState, useMemo, useCallback } from "react";
import "./App.css";

// ─── Formatting helpers ───
const fmt = (n) => (typeof n === "number" ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n);
const fmtInt = (n) => (typeof n === "number" ? n.toLocaleString("it-IT") : n);
const fmtEur = (n) => `€ ${fmt(n)}`;

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

  const hasMarkup = markup > 0;
  const sellingPrice = totalCost * (1 + markup / 100);
  const sellingPricePerConv = config.conversations > 0 ? sellingPrice / config.conversations : 0;
  const marginValue = sellingPrice - totalCost;

  return (
    <div className="result-panel">

      {/* API Cost */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
        <div className="result-total">{fmtEur(totalCost)}</div>
        <span style={{ fontSize: "14px", color: "var(--text-mid)" }}>costo API / mese</span>
      </div>
      <div className="result-sub">
        Costo per conversazione: <strong className="mono">{fmtEur(costPerConv)}</strong>
        &nbsp;&middot;&nbsp;{fmtInt(config.conversations)} conversazioni
      </div>

      {/* Selling price */}
      {hasMarkup && (
        <div className="selling-price-block">
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <div className="selling-price-total">{fmtEur(sellingPrice)}</div>
            <span className="selling-price-label">prezzo di vendita / mese</span>
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
      </div>
      <div className="grid-3" style={{ marginBottom: "1rem" }}>
        <Metric
          label="Trimestrale"
          value={fmtEur((hasMarkup ? sellingPrice : totalCost) * 3)}
          sub={hasMarkup ? `Costo: ${fmtEur(totalCost * 3)}` : "3 mesi"}
        />
        <Metric
          label="Semestrale"
          value={fmtEur((hasMarkup ? sellingPrice : totalCost) * 6)}
          sub={hasMarkup ? `Costo: ${fmtEur(totalCost * 6)}` : "6 mesi"}
        />
        <Metric
          label="Annuale"
          value={fmtEur((hasMarkup ? sellingPrice : totalCost) * 12)}
          sub={hasMarkup ? `Costo: ${fmtEur(totalCost * 12)}` : "12 mesi"}
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

// ─── Advanced Mode ───
function AdvancedMode({ prices, markup }) {
  const [config, setConfig] = useState({
    conversations: 10000, avgDurationSec: 90, turnsPerConv: 3,
    asrModel: "google_asr_standard", ttsModel: "google_tts_wavenet", llmModel: "gemini_flash",
    avgInputTokens: 300, avgOutputTokens: 150, avgTtsChars: 120, pctWithTts: 100,
  });

  const update = useCallback((key, val) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }, []);

  const results = useMemo(() => calcCosts(config, prices), [config, prices]);

  return (
    <>
      <div className="section">
        <div className="section-title">Parametri conversazione</div>
        <div className="section-desc">Configura ogni dettaglio per una stima precisa, utile per capitolati tecnici e preventivi dettagliati.</div>

        <div className="grid-2" style={{ marginBottom: "1rem" }}>
          <div className="form-group">
            <div className="form-label">Conversazioni / mese</div>
            <input className="form-input" type="number" min={0} value={config.conversations} onChange={(e) => update("conversations", Number(e.target.value))} />
          </div>
          <div className="form-group">
            <div className="form-label">Durata media conversazione (secondi)</div>
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
