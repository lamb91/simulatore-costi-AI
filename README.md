# Simulatore Costi AI — Ellysse

Strumento web interattivo per stimare i costi delle API di AI conversazionale (ASR, TTS, LLM). Pensato per i **commerciali Ellysse** nella preparazione di preventivi e capitolati tecnici.

---

## Funzionalità

### Tre modalità di simulazione

**Stima rapida** — scegli un profilo preconfigurato (Voicebot Economico, Voicebot Premium, Chatbot Testuale, Voicebot HD) e regola solo il volume mensile con uno slider. Ideale per una prima stima veloce in call con il cliente.

**Simulazione dettagliata** — configura ogni parametro: conversazioni al mese, durata media, turni per conversazione, token input/output, modelli ASR/TTS/LLM, percentuale di conversazioni con sintesi vocale. Produce output adatto a essere incluso in un capitolato tecnico.

**Confronto modelli** — quattro configurazioni a confronto sullo stesso volume mensile. Le card sono completamente **personalizzabili**: clicca *✎ Modifica* su qualsiasi card per cambiare modelli e parametri in tempo reale. Evidenzia automaticamente la configurazione più conveniente.

### Ricarico commerciale

La barra **Ricarico commerciale** (arancione, sempre visibile) applica un markup percentuale sul costo API e mostra il **prezzo di vendita** al cliente. Il ricarico è globale e si riflette su tutte le modalità. Default: 30%. Impostabile da 0% (solo costo) fino a 200%.

### Listino prezzi configurabile

Il pannello *Configura listino prezzi* permette di modificare i prezzi unitari di ogni provider in USD, con effetto immediato su tutti i calcoli. Include reset ai valori di default.

### Export / Stampa PDF

Ogni modalità ha un bottone **⎙ Esporta / Stampa PDF** che apre la finestra di stampa del browser. Selezionando *Salva come PDF* (disponibile su tutti i browser moderni) si ottiene un documento pulito, con i pannelli di controllo nascosti e la formattazione ottimizzata per la carta.

---

## Provider e modelli supportati

| Categoria | Provider | Modelli |
|-----------|----------|---------|
| ASR | Google Speech-to-Text | Standard, Enhanced |
| TTS | Google | Standard, WaveNet, Neural2, Studio/Chirp 3 |
| TTS | ElevenLabs | Flash 2.5, Multilingual v1, Multilingual v2 |
| LLM | Google | Gemini 2.5 Flash |
| LLM | OpenAI | GPT-4.1 |

> I prezzi di default riflettono i listini pubblici delle API aggiornati a **marzo 2026**. Modificarli dal pannello prezzi se nel frattempo sono cambiati.

---

## Stack tecnico

- **React 19** + **Vite 8**
- CSS vanilla (nessun framework UI)
- Font: IBM Plex Sans, JetBrains Mono (Google Fonts)
- Deploy: **Netlify** (configurazione in `netlify.toml`)

---

## Avvio in locale

```bash
npm install
npm run dev
```

Il dev server parte su `http://localhost:5173`.

### Build di produzione

```bash
npm run build
```

L'output viene generato in `dist/`. Il file `netlify.toml` gestisce il redirect SPA (`/* → /index.html`) necessario per il deploy su Netlify.

---

## Struttura del progetto

```
src/
  App.jsx       — logica e componenti dell'intera applicazione
  App.css       — stili (include @media print per l'export PDF)
  main.jsx      — entry point React
public/
  favicon.svg
  icons.svg
```

Tutta la logica risiede in `App.jsx`: motore di calcolo (`calcCosts`), componenti UI, dati di configurazione (prezzi, profili, configurazioni di confronto di default).

---

## Note per i commerciali

- I costi sono in **USD** (valuta dei listini API). Considera il tasso di cambio EUR/USD nel preventivo finale.
- Le stime non includono: free tier, sconti volume, costi di hosting/infrastruttura, costi di sviluppo e integrazione.
- Usa la **Simulazione dettagliata** quando hai dati precisi dal cliente (durata chiamate, volumi). Usa la **Stima rapida** per una prima valutazione in riunione.
- Il **Confronto modelli** con le card personalizzate è lo strumento ideale per presentare le opzioni al cliente durante una trattativa.
