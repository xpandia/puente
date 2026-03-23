# PUENTE -- Technical & Strategic Audit Report

**Auditor:** Senior Technical Auditor (AI-Assisted)
**Date:** 2026-03-23
**Project:** Puente -- Cross-Border Remittances on Stellar
**Hackathon:** Hack+ Alebrije | CDMX 2026 -- Stellar Track

---

## EXECUTIVE SUMMARY

Puente is an ambitious and emotionally compelling cross-border remittance platform targeting the US-to-LATAM corridor ($150B market). The project demonstrates strong product thinking, exceptional pitch materials, and a well-structured Soroban smart contract. However, it suffers from critical gaps in production readiness: no tests, hardcoded secrets, in-memory storage, and a disconnect between the smart contract and the backend server. This is a strong hackathon entry with a credible path to becoming a real product -- but it is not one yet.

---

## 1. CODE QUALITY: 6.5/10

**Strengths:**
- Consistent code style across Rust and JavaScript
- Good separation of concerns (contract, backend, frontend are cleanly separated)
- Meaningful variable names and clear data structures
- Proper use of Joi validation schemas on all backend input
- Winston logging with structured metadata
- Express middleware stack is well-organized (helmet, cors, rate-limit)

**Weaknesses:**
- **Zero tests anywhere.** The Rust contract has an empty `mod test {}` block with a comment saying tests are "omitted for brevity." The backend has no test file. This is the single largest quality gap.
- No linting configuration (.eslintrc, rustfmt.toml, prettier)
- No CI/CD pipeline
- No `.env.example` file to document required environment variables
- The Rust contract uses `panic!()` for error handling instead of proper Soroban error enums (`contracterror`). Every panic message becomes an opaque "contract trapped" on-chain, making debugging impossible for integrators.
- Dead code in `set_exchange_rate`: `let caller = env.current_contract_address();` is assigned but never used
- No Cargo.toml visible -- cannot verify dependency versions or build configuration

---

## 2. LANDING PAGE: 8.5/10

**Strengths:**
- Visually polished, modern design with excellent typography (Inter font, proper weight hierarchy)
- Responsive design with mobile breakpoints and clamp() for fluid typography
- Interactive savings calculator that dynamically shows fee comparison
- SVG bridge animation connecting sender and receiver -- strong visual storytelling
- Dark-mode "problem" section with gradient stat numbers creates emotional contrast
- Fixed navigation with scroll-based blur effect
- Spanish-first language with bilingual elements -- appropriate for the target market
- CSS-only animations (no heavy JS framework needed)
- Well-structured CSS custom properties for theming

**Weaknesses:**
- All CSS is inline in a single HTML file (21K+ tokens). Should be extracted to a stylesheet for maintainability.
- No favicon or OpenGraph meta tags
- No accessibility considerations (no aria-labels, skip-to-content, focus styles for keyboard nav)
- No form validation on the calculator (minor, since it's a range slider)
- The landing page is entirely static -- no actual connection to the backend API
- No service worker or PWA manifest despite claiming "mobile-first"

---

## 3. SMART CONTRACTS (Soroban/Rust): 7.5/10

**Strengths:**
- Comprehensive domain model: Remittance, Tanda, UserProfile, MemberRecord, KYC levels -- this is not a toy contract
- Fee calculation uses basis points (integer math), avoiding floating-point entirely -- correct for fintech
- Exchange rate uses numerator/denominator pattern with 1e7 scaling -- solid approach
- KYC tiered daily limits ($500/$5,000/$50,000) with automatic daily reset
- Escrow pattern: funds are locked in the contract, not sent directly -- proper for a remittance flow
- Tanda implementation includes missed-contribution tracking and automatic round advancement
- Circuit breaker: `set_paused` can halt all operations
- Refund mechanism with time-based expiry (24h TTL) allows permissionless refunds after expiry
- `require_auth()` properly called on senders, organizers, and admin

**Critical Issues:**
- **No `contracterror` enum.** All errors use `panic!()` with string messages. Soroban best practice is `#[contracterror]` with numeric error codes. String panics waste gas and provide poor UX.
- **No reentrancy guard.** Token transfers (via `token_client.transfer`) call external contracts. While Soroban's architecture mitigates classical reentrancy, the contract does not protect against cross-contract callback manipulation.
- **Exchange rate oracle is admin-controlled.** The comment says "In production this would be: oracle.require_auth()" but production code still uses `require_admin`. An admin-controlled rate is a centralization risk and a single point of manipulation.
- **No slippage protection.** `send_remittance` does not accept a `min_amount_received` parameter. If the admin updates the exchange rate between the user signing and the tx landing, the user could receive less than expected.
- **Tanda payout order is deterministic (FIFO).** The organizer always gets paid first, creating an incentive misalignment -- the organizer has less skin in the game after receiving their payout. Consider randomized or auction-based ordering.
- **No storage TTL management.** Soroban persistent storage requires periodic `extend_ttl()` calls or data expires. The contract never calls `extend_ttl`, meaning remittance records and user profiles could silently disappear.
- **`complete_remittance` takes a `token_address` parameter from the caller.** This is dangerous -- the admin (or settlement oracle) could pass a different token address than the one used during `send_remittance`, leading to fund extraction. The token address should be stored in the `Remittance` struct and used from there.
- **Refund does not return the fee.** When a remittance is refunded, `net = amount_sent - fee` is returned but the fee (already sent to treasury) is not. The sender permanently loses the fee even on a failed/refunded tx.

**Minor Issues:**
- `core::mem::discriminant` for currency comparison works but is fragile -- a simple match or derived PartialEq comparison would be clearer
- No event indexing (Soroban events should use topic slots efficiently for off-chain filtering)
- `TandaContributions` storage key includes round number, leading to unbounded storage growth over many rounds

---

## 4. BACKEND (Node.js/Express): 6/10

**Strengths:**
- Well-structured REST API with versioned routes (`/api/v1/...`)
- Input validation on all write endpoints using Joi schemas
- JWT authentication middleware
- Rate limiting (120 req/min per IP)
- Helmet for security headers
- Proper error handling middleware with catch-all 404 and 500
- Notification system (in-memory but functional for demo)
- Fee quote endpoint is a nice touch for frontend integration
- Sanitization functions prevent leaking internal data

**Critical Issues:**
- **Hardcoded JWT secret in source code:** `"puente-dev-secret-change-me"` is the fallback. If `JWT_SECRET` env var is not set, this is a trivial authentication bypass. This is a P0 security issue.
- **All data is in-memory Maps.** Server restart loses all users, remittances, and tandas. Not suitable for any deployment beyond a demo.
- **Login has no password or cryptographic challenge.** Authentication is `email + stellarPublicKey` -- both are public information. Anyone who knows a user's email and Stellar address can impersonate them. This is not authentication; it is a lookup.
- **`submitStellarPayment` accepts a secret key as a parameter.** This means the backend would need to hold user private keys -- a catastrophic security anti-pattern. The backend should never touch private keys; transactions should be signed client-side.
- **No HTTPS enforcement.** The server listens on plain HTTP.
- **CORS is `*` by default.** Any origin can make authenticated requests.
- **No request body size validation** beyond the 100kb express.json limit
- **Remittance completion has no authorization check** beyond `authenticate` -- any logged-in user can call `POST /remittances/:id/complete` and settle any remittance. The comment says "simulate settlement" but this is an access control bug.

**Minor Issues:**
- `exchangeRates` are hardcoded and never refreshed -- stale rates in any real usage
- No database migration strategy
- No graceful shutdown handling
- No request ID/correlation tracking for distributed tracing
- `sanitizeTanda` spreads `...rest` which may leak internal fields as the object grows

---

## 5. PITCH MATERIALS: 9/10

**Strengths:**
- **Pitch deck (Markdown):** Exceptional storytelling. Opens with emotional weight ("Every week, 40 million families..."), quantifies the problem ($9.3B lost), and builds to a clear solution. The Carlos/Maria narrative is specific, human, and memorable.
- **Pitch deck (HTML):** Fully interactive slide deck with keyboard/touch navigation, speaker notes, animated counters, fee comparison bars, a live savings calculator, TAM/SAM/SOM visualization, competitive comparison table, and responsive design. This is conference-quality.
- **Demo script:** Masterfully structured 3-minute script with exact timing, physical stage directions, contingency plans, and a pre-flight checklist. Shows experience with live demos.
- **Video storyboard:** Cinematic, specific, and culturally grounded. References to son jarocho music, 16mm grain, and real locations in Oaxaca show genuine cultural understanding. The low-budget alternative ($500 total) is practical and honest.
- **Competitive landscape** is well-researched with real fee data from incumbents
- TAM/SAM/SOM sizing is grounded in World Bank data with proper citations

**Weaknesses:**
- Team slide is a placeholder: `[Founder] -- [Background: fintech/blockchain, LATAM roots]`. This will hurt credibility with judges.
- No actual traction metrics (users, waitlist, LOIs) -- everything is projected
- The pitch claims "OXXO cash-out integration via anchor partner" as a 90-day goal, but there is no evidence of any anchor partnership or OXXO API access
- Video storyboard references "puente.app" domain -- no evidence it is registered
- Some market claims are slightly inflated (smartphone penetration cited as both 78% and 85%+ in different documents)

---

## 6. INVESTOR READINESS: 7.5/10

**Strengths:**
- **Investor brief is institutional-grade.** 15+ sections covering problem, solution, market, unit economics, competitive moat, GTM, business model, 3-year projections, team requirements, funding ask, risks, and exit strategy.
- Unit economics are detailed and plausible: $2.50 revenue per remittance, $0.35 cost, 86% gross margin, LTV:CAC of 10.8:1
- $3M seed ask with specific allocation breakdown (35% eng, 20% compliance, 20% growth, 15% ops, 10% reserves)
- Comparable seed rounds are well-chosen (Remitly, Chipper Cash, Bitso, Felix Pago)
- Risk section is honest and specific, with real mitigations (not hand-waving)
- Exit strategy identifies 5 acquirer categories with strategic rationale

**Weaknesses:**
- **No team.** The investor brief describes "team requirements" instead of actual team members. This is the biggest red flag for any investor.
- Revenue projections show a 60x jump from Year 1 ($200K) to Year 3 ($12M). The growth curve is aggressive and under-explained.
- "Viral coefficient: 1.8x" is stated without evidence or methodology
- No mention of compliance costs in unit economics (MSB licensing alone costs $100K-500K)
- Path to profitability shows Year 3 "approaching break-even" at $12M revenue but $350K/month burn ($4.2M/year) -- the numbers do not quite add up
- MoneyGram Access dependency is identified as a risk but also listed as a core feature -- this tension is not resolved
- No cap table, existing investors, or SAFE terms discussed

---

## 7. HACKATHON FIT: 8.5/10

**Strengths:**
- **Perfect Stellar track alignment.** Uses USDC on Stellar, Soroban smart contracts, Stellar DEX for currency conversion, and the Stellar SDK. This is not a project that bolted Stellar on as an afterthought.
- Addresses a real, massive problem (remittance fees) that Stellar was literally designed to solve
- Cultural authenticity: tandas are a genuinely innovative on-chain use case, not a generic DeFi clone
- Complete deliverable set: landing page, smart contract, backend API, pitch deck, demo script, video storyboard, investor brief
- The Tanda concept is a differentiator that no other remittance project offers -- this will stand out to judges

**Weaknesses:**
- **Smart contract is not actually deployed to testnet** (or at least there is no evidence of deployment -- no contract ID, no deploy script, no testnet transaction hashes)
- No working end-to-end demo: the frontend is a static landing page, the backend uses in-memory stores, and the smart contract is not connected to the backend
- The frontend does not interact with the backend API at all -- there is no fetch/axios call anywhere in the HTML
- No Cargo.toml or build script for the Rust contract
- README checklist items are all unchecked: `- [ ] Landing page live and responsive`, `- [ ] Soroban smart contracts deployed to Stellar Testnet`, etc.

---

## 8. CRITICAL ISSUES

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| 1 | **Hardcoded JWT secret** in server.js source code | P0 - Critical | Backend |
| 2 | **No authentication on login** -- email + public key is not a credential | P0 - Critical | Backend |
| 3 | **Backend holds user private keys** via `submitStellarPayment(senderSecret, ...)` | P0 - Critical | Backend |
| 4 | **Zero tests** across the entire codebase | P0 - Critical | All |
| 5 | **`complete_remittance` takes token_address from caller** instead of stored record | P0 - Critical | Contract |
| 6 | **No slippage protection** on remittance conversion | P1 - High | Contract |
| 7 | **All data in-memory** -- server restart = total data loss | P1 - High | Backend |
| 8 | **Any authenticated user can settle any remittance** | P1 - High | Backend |
| 9 | **No storage TTL extension** -- data silently expires on-chain | P1 - High | Contract |
| 10 | **Refund does not return the fee** to sender | P1 - High | Contract |
| 11 | **Panic-based errors** instead of `contracterror` enum | P2 - Medium | Contract |
| 12 | **Team slide is empty** | P2 - Medium | Pitch |
| 13 | **Frontend disconnected from backend** | P2 - Medium | Integration |
| 14 | **No contract deployment evidence** | P2 - Medium | Contract |

---

## 9. RECOMMENDATIONS

### P0 -- Fix Before Demo/Submission

1. **Remove `submitStellarPayment` function entirely.** The backend must never hold private keys. Use Stellar's SEP-10 (Web Authentication) for login and have users sign transactions client-side via Freighter wallet or a custodial wallet provider.

2. **Implement proper authentication.** Replace email+publicKey login with Stellar SEP-10 challenge-response authentication, which cryptographically proves key ownership.

3. **Move JWT secret to environment variable only** and remove the hardcoded fallback. Add a startup check that crashes the server if `JWT_SECRET` is not set.

4. **Store `token_address` in the `Remittance` struct** and use it in `complete_remittance` and `refund_remittance` instead of accepting it as a parameter.

5. **Fill in the team slide** with real team member names and backgrounds. An empty team slide will immediately disqualify you in judges' eyes.

6. **Deploy the contract to Stellar Testnet** and record the contract ID. Update README checklist. This takes 30 minutes and dramatically strengthens the submission.

### P1 -- Fix Before Any Pilot/Beta

7. **Add slippage protection:** Accept `min_amount_received` in `send_remittance` and revert if the calculated amount is below it.

8. **Replace in-memory stores** with PostgreSQL (as already mentioned in the README tech stack). Use Prisma or Knex for migrations.

9. **Add role-based access control** for settlement endpoints. Only an admin or designated settlement oracle should be able to complete remittances.

10. **Implement `extend_ttl()`** on all persistent storage writes in the contract.

11. **Refund the full amount** (including fee) on refunds, or clearly document that fees are non-refundable and show this to users before they send.

12. **Write tests.** At minimum:
    - Rust: 5-10 unit tests covering happy path and error cases for `send_remittance`, `complete_remittance`, `refund_remittance`, `create_tanda`, `contribute`, `execute_payout`
    - Backend: Integration tests for auth, remittance CRUD, and tanda lifecycle

### P2 -- Fix Before Production

13. **Replace `panic!()` with `#[contracterror]` enum** for all error cases in the Rust contract.

14. **Connect the frontend to the backend.** Add a simple send-money form on the landing page that hits the `/api/v1/rates/quote` endpoint to show live fee calculations.

15. **Add accessibility** to the landing page: aria-labels, keyboard navigation, focus indicators, alt text.

16. **Add a `.env.example` file** documenting all required environment variables.

17. **Set up CI/CD** with linting (eslint + rustfmt) and automated tests.

18. **Implement proper exchange rate oracle** -- fetch rates from a real source (Stellar DEX, CoinGecko, or Banxico API for MXN).

---

## 10. OVERALL SCORE

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Code Quality | 6.5/10 | 15% | 0.975 |
| Landing Page | 8.5/10 | 10% | 0.850 |
| Smart Contracts | 7.5/10 | 20% | 1.500 |
| Backend | 6.0/10 | 15% | 0.900 |
| Pitch Materials | 9.0/10 | 15% | 1.350 |
| Investor Readiness | 7.5/10 | 10% | 0.750 |
| Hackathon Fit | 8.5/10 | 15% | 1.275 |
| **OVERALL** | | **100%** | **7.6/10** |

---

## VERDICT

**Puente is a 7.6/10 hackathon project -- strong concept, compelling narrative, but incomplete execution.**

The team has built something that *looks* like a complete product and *reads* like a fundable startup, but under the hood, the components are disconnected and carry critical security flaws. The smart contract is the strongest technical artifact -- it demonstrates genuine understanding of remittance mechanics, escrow patterns, and community savings (tandas). The pitch materials are best-in-class for a hackathon. The backend, however, has authentication so broken it would not survive a cursory security review.

**For the hackathon:** If the team deploys the contract to testnet, fills in the team slide, and connects even one frontend form to the backend, this project could place in the top tier. The narrative alone -- Carlos and Maria, $40/week in stolen fees, tandas as on-chain culture -- is more emotionally resonant than 95% of hackathon projects.

**For the real world:** This needs 3-6 months of engineering before it touches real money. Authentication must be rebuilt from scratch. The backend needs a database, proper key management, and compliance infrastructure. The contract needs tests, error enums, storage TTL management, and a security audit. But the product vision is sound, the market is real, and the Stellar track alignment is excellent.

**Bottom line:** Great pitch, good contract, weak backend, no integration. Fix the P0s and this goes from "impressive hackathon project" to "credible seed-stage startup."

---

*Audit generated 2026-03-23. This report reflects the state of the codebase at the time of review and does not constitute a formal security audit or investment recommendation.*
