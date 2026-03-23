# Puente -- Investor Brief

**Confidential | March 2026**

---

## A. ONE-LINER

Puente turns the $150 billion Latin American remittance corridor into a near-zero-fee, 5-second transfer on Stellar -- and builds on-chain credit for the 200 million unbanked people on the receiving end.

---

## B. PROBLEM (With Data)

The remittance corridor to Latin America is the most expensive money transfer system in the world relative to the income of its users:

| Pain Point | Data |
|---|---|
| Annual remittances to LATAM | **$150 billion+** (World Bank, 2025) |
| Mexico alone | **$63 billion** (Banxico, 2025) -- Mexico's #1 source of foreign income |
| Average remittance fee (traditional) | **6.2%** of transfer value (World Bank Remittance Prices Worldwide, 2024) |
| Total fees paid by LATAM remittance senders | **$9-12 billion annually** |
| Average transfer time (traditional) | **2-5 business days** |
| Unbanked adults in LATAM | **~200 million** (World Bank Findex, 2024) |
| Adults with no credit history in LATAM | **~250 million** (TransUnion LATAM, 2023) |
| Active tanda (informal savings circle) participants | **~30 million** across Mexico, Central America (CGAP estimate) |
| Fee on a typical $500 transfer | **$30-40** (Western Union, MoneyGram average) |

**The human cost:** A construction worker in Houston sending $500 home to Oaxaca pays $35 in fees. That $35 feeds his children for a week. Over a career of 20 years of monthly remittances, he loses **$8,400** -- roughly 10% of a house in rural Mexico -- to intermediary fees.

**The credit desert:** 200 million unbanked LATAM adults have no path to credit. Yet 30 million of them participate in tandas (rotating savings circles) that demonstrate financial discipline -- but generate zero portable credit history because they operate informally.

---

## C. SOLUTION

Puente is a **cross-border remittance and micro-lending platform** built on Stellar that delivers three capabilities no incumbent offers together:

**10x improvements:**

| Dimension | Western Union / MoneyGram | Crypto P2P (Binance) | Puente |
|---|---|---|---|
| Transfer fee | 6-8% | 1-3% | **< 0.5%** |
| Settlement time | 2-5 days | 10-30 min | **< 5 seconds** |
| Cash-out access | Agent locations | Exchange withdrawal | **MoneyGram Access + mobile money** |
| Credit building | None | None | **On-chain reputation from every tx** |
| Savings product | None | None | **On-chain tandas (Soroban smart contracts)** |
| KYC/AML compliance | Full | Varies | **Full (Onfido/Sumsub)** |
| Minimum transfer | $50+ | $10+ | **$1** |
| Recipient needs | ID + agent visit | Crypto wallet + exchange | **Phone number (custodial wallet)** |

**Three-layer product:**
1. **Send**: USD to local currency (MXN, GTQ, HNL) in 5 seconds via USDC on Stellar. Cash out at MoneyGram Access points or mobile money.
2. **Save (Tandas)**: Soroban smart contracts formalize rotating savings circles. Automated contributions, transparent rotation, no broken promises.
3. **Build**: Every on-time tanda payment and successful remittance builds a verifiable on-chain reputation score -- a financial passport that unlocks micro-loans and better rates.

---

## D. WHY NOW

1. **Stellar + MoneyGram Access**: Stellar's partnership with MoneyGram (launched 2024) created a global fiat off-ramp network with cash-out in 200+ countries. This eliminates the hardest part of crypto remittances -- last-mile fiat delivery.

2. **Soroban smart contracts**: Stellar launched Soroban (smart contract platform) in 2024, enabling programmable financial products (tandas, credit scoring) on the fastest, cheapest payment blockchain.

3. **USDC on Stellar**: Circle launched native USDC on Stellar in 2023. Stellar now has the most efficient USDC rail -- sub-cent fees, 5-second finality, native integration.

4. **Regulatory clarity**: Mexico's Fintech Law (2018, updated 2024), El Salvador's digital payments framework, and Guatemala's electronic money regulations have created legal frameworks for digital remittances.

5. **Incumbent vulnerability**: Western Union and MoneyGram's agent-based models carry 40-60% gross margins on fees. They cannot cut fees without destroying their business model. This is a classic disruption setup.

6. **Mobile penetration**: 85%+ smartphone penetration in LATAM remittance corridors. The recipient no longer needs to walk to an agent -- they need an app.

---

## E. MARKET SIZING

| Tier | Value | Methodology |
|---|---|---|
| **TAM** | **$150 billion** | Total annual remittance flow to LATAM (World Bank, 2025) |
| **SAM** | **$45 billion** | US-to-Mexico/Central America corridor (~30% of LATAM total) -- Puente's initial target corridors |
| **SOM** | **$1.35 billion** | 3% of SAM by Year 5 -- ~2.7M active senders, $500 avg monthly transfer |

**Revenue on SOM:** At 0.5% fee, $1.35B in volume = **$6.75M** in remittance revenue. Add tanda/lending and premium products for total revenue of **$15-20M** by Year 5.

**Adjacent markets:**
- LATAM micro-lending: $25B (using on-chain credit scores)
- Cross-border payroll (LATAM remote workers): $15B
- Tanda-based group insurance: $5B

---

## F. UNIT ECONOMICS

| Metric | Value | Notes |
|---|---|---|
| **Revenue per remittance** | $2.50 | 0.5% fee on avg $500 transfer |
| **Cost per remittance** | $0.35 | Stellar gas ($0.0001), compliance screening ($0.15), MoneyGram Access fee ($0.20) |
| **Gross margin per remittance** | **86%** | |
| **LTV (sender, 3-year)** | $270 | Avg 3 transfers/month x $2.50 x 36 months x 0.8 retention factor |
| **CAC** | $25 | Referral-driven (community, WhatsApp, word-of-mouth in migrant communities) |
| **LTV:CAC** | **10.8:1** | Strong for fintech |
| **Gross margin** | **82%** | Blended across remittances + tandas + premium |
| **Burn multiple** | **1.5x** | Lean team, low infrastructure cost (Stellar = sub-cent) |
| **CAC payback** | **3 months** | 3 transfers/month covers CAC in first month |

---

## G. COMPETITIVE MOAT

**Primary moat: On-chain credit reputation system -- every transfer and tanda payment builds portable financial identity that no competitor offers**

| Competitor | Fee | Speed | Credit Building | Tandas | Blockchain | LATAM Focus |
|---|---|---|---|---|---|---|
| **Puente** | **0.5%** | **5 sec** | **Yes (on-chain)** | **Yes (Soroban)** | **Stellar** | **Core** |
| Western Union | 6-8% | 2-5 days | No | No | No | Yes |
| MoneyGram | 5-7% | 1-3 days | No | No | No | Yes |
| Remitly | 2-4% | 1-3 days | No | No | No | Yes |
| Wise | 1-2% | 1-2 days | No | No | No | Partial |
| Strike (Lightning) | 0.5-1% | Minutes | No | No | Bitcoin | Partial |
| Bitso | 1-2% | Minutes | No | No | Multi | Yes |

**Defensibility layers:**
1. **Credit reputation graph**: On-chain history is portable and composable. Users cannot replicate their Puente reputation elsewhere -- it is the sum of every transaction, tanda payment, and repayment.
2. **Tanda network effects**: Tandas are social -- each member invites others. A user in a 10-person tanda brings 9 new users to the platform.
3. **MoneyGram Access integration**: Partnership provides 350,000+ cash-out points across LATAM -- no competitor can build this network.
4. **Corridor-specific optimization**: Each remittance corridor (US-MX, US-GT, US-HN) requires specific fiat on/off-ramp integrations, compliance configurations, and local partnerships. This operational depth takes time.
5. **Community trust**: Migrant communities operate on word-of-mouth trust. Once Puente becomes the trusted tool in a community, switching costs are high.

---

## H. GO-TO-MARKET

**Beachhead:** US-to-Mexico corridor (Houston, Dallas, LA, Chicago to Mexican states)
- Largest single remittance corridor in the world ($63B/year)
- Highest concentration of potential users
- MoneyGram Access has deepest coverage in Mexico
- Regulatory frameworks in place on both sides

**Phase 1 (Months 1-6): Community seeding**
- Launch in 3 US cities with large Mexican migrant populations (Houston, LA, Chicago)
- Partner with 5 Mexican consulates for in-person onboarding events
- Hire community ambassadors (1 per city) -- trusted community members who onboard friends/family
- WhatsApp-first marketing (the communication channel for this demographic)
- Target: 5,000 active senders, $3M monthly volume

**Phase 2 (Months 6-12): Tanda launch + viral growth**
- Launch on-chain tandas for remittance recipients in Mexico
- Each tanda (10 members) = 10 new users, 120 transactions/year
- Referral program: sender gets 3 free transfers for each referred sender
- Target: 30,000 active senders, $20M monthly volume, $1.2M ARR

**Phase 3 (Months 12-24): Multi-corridor expansion**
- Guatemala, Honduras, El Salvador corridors
- Micro-lending product using on-chain reputation (partner with LATAM neobanks)
- B2B: cross-border payroll for LATAM remote workers
- Target: 150,000 active senders, $100M monthly volume, $6M ARR

**Viral coefficient:** 1.8x (tanda social dynamics + WhatsApp sharing + family referrals create strong organic growth in tight-knit migrant communities)

**Key partnerships:**
- Stellar Development Foundation (grants, technical support)
- MoneyGram Access (fiat off-ramp across LATAM)
- Mexican consulates (trust + distribution channel)
- LATAM neobanks (Nubank, Ualá) for credit-building integration
- Remittance advocacy groups (migrant worker organizations)

---

## I. BUSINESS MODEL

**Revenue streams:**

| Stream | Pricing | % of Revenue (Year 3) |
|---|---|---|
| Remittance fees | 0.5% of transfer value | 40% |
| FX spread | 0.3% embedded in exchange rate | 25% |
| Tanda platform fee | 1% of total tanda pool per cycle | 15% |
| Micro-lending interest spread | 5-8% annual interest on micro-loans | 10% |
| Premium features (instant cash-out, higher limits) | $3-5/month | 5% |
| Data/API licensing (credit scores to neobanks) | Revenue share per credit inquiry | 5% |

**Pricing strategy:**
- 0.5% total cost (fee + spread) vs. 6-8% incumbent pricing = **92% cost reduction** for users
- Tanda platform fee (1%) is invisible to users -- they pay nothing upfront; fee comes from the yield/spread
- Micro-lending rates (15-25% APR) are 60-80% below informal lender rates (100-400% APR) but sustainable for Puente

**Path to profitability:**
- Year 1: $200K revenue, -$1.8M
- Year 2: $3M revenue, -$1.5M (corridor expansion)
- Year 3: $12M revenue, approaching break-even
- Year 4: $30M revenue, profitable

---

## J. 3-YEAR FINANCIAL PROJECTIONS

| Metric | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| **Active senders** | 5,000 | 50,000 | 200,000 |
| **Monthly transfer volume** | $3M | $35M | $150M |
| **Annual transfer volume** | $36M | $420M | $1.8B |
| **Active tanda participants** | 0 | 10,000 | 80,000 |
| **Revenue** | $200K | $3.0M | $12.0M |
| **MRR** | $15K | $210K | $850K |
| **ARR** | $180K | $2.5M | $10.2M |
| **Gross margin** | 75% | 80% | 84% |
| **Monthly burn** | $150K | $250K | $350K |
| **Team size** | 10 | 25 | 50 |
| **Corridors active** | 1 (US-MX) | 3 (US-MX, US-GT, US-HN) | 5 (+US-SV, US-CO) |
| **On-chain credit scores issued** | 0 | 5,000 | 50,000 |

---

## K. TEAM REQUIREMENTS

**Founding team (4 roles):**

| Role | Profile | Why Critical |
|---|---|---|
| **CEO** | Fintech/remittance industry experience; ideally from or deeply connected to migrant communities | Trust and credibility in target communities; regulatory navigation |
| **CTO** | Stellar/Soroban expert; payment systems architecture; mobile-first development | Core protocol is the product; Stellar integration depth matters |
| **Head of Compliance** | KYC/AML expert; US MSB + LATAM money transmission licensing; cross-border regulatory | Compliance is existential in remittances -- a single violation can shut down the company |
| **Head of Growth** | Community-led growth in underserved markets; WhatsApp/social marketing; LATAM migrant community expertise | CAC depends on trust-based, community-driven acquisition |

**First 10 hires (Months 3-12):**
1. Senior Soroban developer (tanda + reputation contracts)
2. React Native developer (mobile app)
3. Backend engineer (Node.js, Stellar SDK integration)
4. Compliance analyst (KYC/AML operations)
5. Community ambassador -- Houston
6. Community ambassador -- Los Angeles
7. Community ambassador -- Chicago
8. Country operations manager -- Mexico
9. Product designer (mobile UX for low-literacy users)
10. Customer support (bilingual EN/ES, WhatsApp-first)

**Advisory board targets:**
- Former Western Union or MoneyGram executive (industry intelligence)
- Stellar Development Foundation team member
- US money services business (MSB) compliance attorney
- Mexican financial regulator (CNBV/Banxico) former official
- LATAM neobank executive (Nubank, Ualá, or Fondeadora)

---

## L. FUNDING ASK

**Raising: $3.0M Seed Round**

| Use of Funds | Allocation | Amount |
|---|---|---|
| Engineering (Stellar integration, mobile app, Soroban contracts) | 35% | $1.05M |
| Compliance and licensing (US MSB + LATAM money transmission) | 20% | $600K |
| Community growth (ambassadors, consulate partnerships, marketing) | 20% | $600K |
| Operations (team, office, infrastructure) | 15% | $450K |
| Reserves (float, working capital) | 10% | $300K |

**Milestones this round unlocks:**
1. US MSB license obtained; Mexico money transmission partnership signed
2. Mobile app live on iOS + Android with full remittance flow
3. 5,000 active monthly senders on US-Mexico corridor
4. $3M monthly transfer volume
5. On-chain tanda product launched with 500 active participants
6. MoneyGram Access integration live for cash-out in Mexico
7. Series A readiness ($10-15M raise at $50-70M valuation)

**Valuation range:** $12M - $16M pre-money (fintech/payments seed comps for LATAM market)

**Comparable seed rounds:**
- Remitly: $2.6M seed (2012) -- now $6B+ market cap (IPO 2021)
- Chipper Cash (Africa remittances): $2.4M seed (2019) -- raised $300M+ total
- Bitso (LATAM crypto exchange): $3M seed (2018) -- valued at $2.2B (2021)
- Felix Pago (LATAM remittances): $1.5M seed (2021)
- Fondeadora (Mexico neobank): $2M seed (2019)

---

## M. RISKS AND MITIGATIONS

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Regulatory / licensing failure** -- unable to obtain or maintain money transmission licenses in US or LATAM | Critical | Hire compliance counsel pre-launch; apply for licenses in Month 1; partner with licensed MTL holder initially (Wyre/Bridge model); state-by-state strategy in US; Mexico partnership with licensed SOFOM |
| 2 | **MoneyGram Access dependency** -- MoneyGram changes terms, pricing, or discontinues Stellar integration | High | Diversify cash-out: local bank transfer APIs, mobile money integrations (M-Pesa equivalents), OXXO partnership in Mexico; negotiate multi-year contract with MoneyGram; build direct cash-out agent network as backup |
| 3 | **USDC de-peg or Stellar network risk** -- stablecoin instability or blockchain downtime during transfers | Medium | Multi-stablecoin support (USDC + EURC + local stablecoins); Stellar has 99.99% uptime since 2015; transfer settlement in < 5 seconds minimizes exposure window; insurance on float balances |
| 4 | **Incumbent response** -- Western Union or Remitly drops fees to 1% in LATAM corridors | Medium | Puente's cost structure is 10x lower (no agent network, no physical infrastructure); 0.5% is sustainable at our cost basis; differentiation through tandas and credit building -- not just price; incumbents cannot cut fees without destroying margins |
| 5 | **Fraud and money laundering** -- remittance corridors attract illicit finance; a single incident could be catastrophic | High | Enterprise-grade KYC/AML (Onfido + Sumsub); transaction monitoring (Chainalysis); conservative transaction limits initially ($1K/month); suspicious activity reporting (SAR) automation; compliance team from Day 1 |

---

## N. EXIT STRATEGY

**Potential acquirers:**

| Acquirer Type | Examples | Strategic Rationale |
|---|---|---|
| Incumbent remittance | Western Union, MoneyGram, Ria | Acquire blockchain rails and mobile-first user base to modernize |
| Digital payments | PayPal, Wise, Revolut | LATAM corridor volume and on-ramp/off-ramp infrastructure |
| LATAM fintechs | Nubank, Mercado Pago, Ualá | Add remittance and credit-building to existing 100M+ user base |
| Crypto infrastructure | Circle, Stellar, Coinbase | Fiat on/off-ramp network and compliant payment flows |
| Banking | JP Morgan, BBVA (LATAM), Santander | LATAM migrant banking and credit product distribution |

**Comparable exits:**
- Remitly IPO at **$6.8B** (2021) -- digital remittances
- Wise IPO at **$11B** (2021) -- cross-border transfers
- Chipper Cash valued at **$2.2B** (2021) -- Africa/UK remittances
- TransferGo raised $50M+ -- UK/Europe corridors
- Bitso valued at **$2.2B** (2021) -- LATAM crypto (used for MX remittances)
- Intermex IPO at **$1.5B** (2018) -- US-LATAM remittances

**IPO timeline:** Year 6-8 at $1B+ annual transfer volume, $200M+ ARR

**Target exit multiple:** 10-20x ARR for high-growth fintech with payments + lending + credit infrastructure

---

*This document is confidential and intended solely for prospective investors. Forward-looking projections are estimates based on current market conditions and assumptions.*
