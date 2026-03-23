# Puente

**The bridge between your work and your family's future.**

---

## Vision

> "Every dollar a worker sends home should arrive whole. Technology should erase borders, not profit from them."

Puente is a cross-border remittance and micro-lending platform built on the Stellar blockchain. We turn the $150B annual remittance flow to Latin America into a system that works *for* families — not against them.

---

## The Problem

Every year, Latin American families lose **$9–12 billion** to remittance fees. A construction worker in Texas sending $500 home to Oaxaca pays $30–40 in fees — money that could feed his children for a week. Traditional providers charge 6–8% per transfer, exploit exchange rates, and take 2–5 days to deliver.

Meanwhile, millions of unbanked families across LATAM rely on *tandas* — informal lending circles built on trust — to fund emergencies, education, and small businesses. These systems work, but they have no transparency, no dispute resolution, and no path to building credit.

**The status quo is a tax on being far from the people you love.**

---

## The Solution

Puente uses Stellar's blockchain to deliver:

- **Near-zero remittances** — Transfers at under 1% fees, settled in seconds, not days.
- **On-chain tandas** — Lending circles formalized as Soroban smart contracts with transparent rules, automated payouts, and portable reputation.
- **A path to financial identity** — Every on-time tanda payment builds an on-chain credit history that no bank can ignore.

---

## How It Works

### 1. Send
A user in the US enters an amount in USD. Puente converts it to USDC on Stellar, transfers it cross-border in ~5 seconds, and the recipient withdraws in local currency (MXN, GTQ, HNL) via partner cash-out points or mobile money.

### 2. Save (Tandas)
Users form or join a tanda — a rotating savings group. A Soroban smart contract enforces contributions, manages the rotation schedule, and releases funds automatically. No middleman. No broken promises.

### 3. Build (Planned)
Every completed tanda cycle, every on-time payment, every successful remittance — it all builds a verifiable on-chain reputation. This becomes the user's financial passport: proof of reliability that unlocks micro-loans, better rates, and eventually, traditional financial products.

> **Current status:** The reputation/credit-scoring system is on the roadmap. The smart contract already tracks on-time contributions and missed payments per tanda member, which will serve as the foundation.

---

## Tech Stack

| Layer | Technology | Status |
|---|---|---|
| **Blockchain** | Stellar Network, Soroban Smart Contracts | Implemented (Testnet) |
| **Tokens** | USDC (Stellar) | Implemented |
| **Frontend** | Static HTML/CSS landing page | Implemented |
| **Backend** | Node.js, Express, Stellar SDK | Implemented (in-memory stores) |
| **Identity / KYC** | Tiered KYC levels enforced in contract + API | Implemented (stub verification) |
| **Auth** | Stellar keypair signature verification (challenge-response) | Implemented |
| **Fiat On/Off Ramp** | Stub endpoints (MoneyGram Access planned) | Stub |
| **Data** | In-memory Maps (PostgreSQL planned) | Planned |
| **Infrastructure** | Local dev (Vercel/Railway planned) | Planned |

> **Note:** This is a hackathon MVP. In-memory data stores, stub fiat ramps, and KYC verification are placeholders. See the [Roadmap](#roadmap) for production plans.

---

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Sender (US)   │──────▶│   Puente API     │──────▶│  Recipient (MX) │
│   React Native  │       │   Node.js        │       │  Mobile / Cash  │
└─────────────────┘       └────────┬─────────┘       └─────────────────┘
                                   │
                          ┌────────▼─────────┐
                          │  Stellar Network │
                          │  ┌─────────────┐ │
                          │  │   Soroban    │ │
                          │  │  Contracts   │ │
                          │  │ - Remittance │ │
                          │  │ - Tanda      │ │
                          │  │ - Reputation │ │
                          │  └─────────────┘ │
                          └──────────────────┘
```

---

## Market Opportunity

| Metric | Value |
|---|---|
| Annual remittances to LATAM | **$150B+** |
| Mexico alone | **$63B** (2025) |
| Average fee (traditional) | **6.2%** |
| Puente target fee | **< 1%** |
| Unbanked adults in LATAM | **~200M** |
| Active tanda participants (est.) | **~30M** |
| Value captured by fee reduction | **$7.5B+ annually** |

---

## Team

| Role | Responsibility |
|---|---|
| **Product & Design** | User research, UX/UI, landing page, pitch deck |
| **Blockchain Engineer** | Soroban smart contracts, Stellar integration, tokenomics |
| **Full-Stack Developer** | React Native app, Node.js API, database, deployment |
| **Business & Compliance** | KYC/AML strategy, partnerships, go-to-market |

---

## Hackathon Submission Checklist

- [x] Landing page live and responsive
- [x] Soroban smart contract written (Remittance + Tanda in single contract)
- [ ] Smart contract deployed to Stellar Testnet
- [x] Backend API with auth, remittance lifecycle, tanda management
- [x] Stellar keypair signature-based authentication (challenge-response)
- [ ] Working end-to-end demo (frontend connected to backend)
- [ ] 3-minute pitch video
- [x] Slide deck (problem, solution, demo, market, team)
- [ ] DoraHacks BUIDL submission page complete
- [x] GitHub repo public with clear README

---

## Roadmap

**Hackathon (March 2026):** MVP — remittance flow + tanda smart contracts on Testnet.

**Q2 2026:** Beta launch with 100 users on US–Mexico corridor. MoneyGram Access integration.

**Q3 2026:** Tanda product launch. On-chain reputation system live.

**Q4 2026:** Expand to Guatemala, Honduras, El Salvador corridors. Micro-lending pilot.

**2027:** 50,000 active users. Institutional partnerships. Credit-building integrations with LATAM neobanks.

---

## Security

- **No private keys on the backend.** All Stellar transaction signing happens client-side (e.g., via Freighter wallet). The backend never touches user secret keys.
- **Cryptographic authentication.** Login uses a challenge-response flow: the server issues a random nonce, the client signs it with their Stellar keypair, and the server verifies the Ed25519 signature. Email + public key alone is not sufficient to authenticate.
- **JWT secrets are environment-only.** The server refuses to start without a `JWT_SECRET` environment variable. No hardcoded fallbacks.
- **Smart contract token safety.** The `complete_remittance` and `refund_remittance` functions use the token address stored at send time, not a caller-supplied parameter, preventing fund extraction attacks.
- **Proper error handling.** The Soroban contract uses a `#[contracterror]` enum with numeric error codes instead of string panics, providing clear on-chain error reporting.

---

## Why Stellar?

Stellar was purpose-built for this. Sub-second finality. Fees measured in fractions of a cent. Native USDC support. The MoneyGram Access partnership for fiat off-ramps across Mexico and Latin America. Soroban smart contracts for programmable financial products. No other chain combines all of this for remittances.

---

## License

MIT

---

*Built with conviction at Hack+ Alebrije | CDMX 2026.*
*Because the bridge between a worker and their family should cost nothing to cross.*
