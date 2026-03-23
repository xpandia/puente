# PUENTE — DEMO SCRIPT
## 3 Minutes. Two Countries. One Family.

---

### Pre-Demo Setup
- Two phones (or emulators) side by side on screen
- Left phone labeled **"Carlos — Houston, TX"**
- Right phone labeled **"Maria — Oaxaca, MX"**
- Stellar transaction explorer open in background tab
- Timer visible to audience

---

## [0:00–0:30] THE STORY

*[Speaker, calm, direct — no slides, just talking to the room.]*

> "Let me introduce you to two people."

> "Carlos is 34. He builds houses in Houston. Six days a week, ten hours a day. He has been in the US for eleven years."

> "Maria is his mother. She is 61. She lives in a small town outside Oaxaca. She raised four children alone after Carlos's father passed."

> "Every Friday, Carlos sends money home. Every Friday, Western Union takes $30 to $50 of it. Every Friday, Maria receives less than Carlos sent."

> "That ends today. Let me show you."

---

## [0:30–1:15] THE SEND — CARLOS'S SIDE

*[Pick up the left phone. Show the screen.]*

> "This is Puente. Carlos opens it Friday evening after work."

**Action: Open the app. Home screen shows:**
- Balance: $1,240 USDC
- Recent sends to "Mama" (Maria)
- Big green button: **"Enviar / Send"**

> "He taps Send."

**Action: Tap Send.**

> "He selects Maria — she is already in his contacts. He has sent to her 47 times."

**Action: Select Maria from contacts. Show the contact card — her name, town (Santiago Matatlan, Oaxaca), preferred cash-out: OXXO.**

> "He types $500."

**Action: Type 500. The screen shows:**
```
Sending:        $500.00 USD
Fee:            $2.50 (0.5%)
Maria receives: 9,714.25 MXN
Exchange rate:  1 USD = 19.51 MXN (live Stellar DEX rate)
Arrival:        ~5 seconds
```

> "Look at that fee. Two dollars and fifty cents. Not thirty. Not fifty. Two fifty."

> "He confirms with his fingerprint."

**Action: Tap confirm. Touch fingerprint sensor.**

---

## [1:15–1:45] THE BRIDGE — STELLAR IN ACTION

*[Switch to the Stellar transaction explorer — or show a simplified animation.]*

> "Now watch what happens on Stellar."

**On screen — animated or live explorer:**

```
Step 1: Carlos's USDC → Stellar network        [0.8s]
Step 2: Stellar DEX: USDC → MXN anchor token   [1.2s]
Step 3: MXN anchor token → Maria's wallet       [0.9s]
Step 4: Settlement confirmed                    [1.3s]
                                    TOTAL:       4.2 seconds
```

> "Four point two seconds. Three hops on the Stellar network. Total network fee: a fraction of a cent."

> "No correspondent banks. No SWIFT. No 3-day hold. The money is already there."

---

## [1:45–2:15] THE RECEIVE — MARIA'S SIDE

*[Pick up the right phone. It buzzes with a notification.]*

> "Maria is at home. Her phone buzzes."

**Action: Show the notification:**
```
Puente: Carlos te envio $9,714.25 MXN
```

> "She opens Puente."

**Action: Open the app. Show the receive screen:**
```
Recibiste de Carlos:
$9,714.25 MXN

[Guardar en Puente]  [Retirar en OXXO]  [Enviar a alguien]
```

> "She has three choices. Keep it digital in Puente. Send it to someone else. Or — and this is key — walk to the OXXO three blocks from her house and withdraw cash."

**Action: Tap "Retirar en OXXO". Show a QR code with:**
```
Codigo de retiro OXXO
Monto: $9,714.25 MXN
Valido por: 24 horas
[QR CODE]
```

> "She shows this QR at the OXXO counter. Cash in hand. No bank account. No ID fax. Done."

---

## [2:15–2:45] THE TANDA — COMMUNITY POWER

> "But Maria does something else with some of that money."

**Action: Navigate to the Tandas section. Show an active tanda:**
```
Tanda: "Las Comadres de Matatlan"
Members: 10 | Contribution: $500 MXN/month
Current round: 7 of 10
Next payout: Maria (this month!)
Smart contract: verified on Stellar
```

> "Maria and nine of her neighbors run a tanda — a rotating savings circle. Each month, everyone puts in 500 pesos. Each month, one person gets the full 5,000."

> "This has existed in Mexico for centuries. But now it runs on a Stellar smart contract. No one can skip. No one can cheat. And every on-time payment builds Maria's on-chain credit score."

> "A woman with zero banking history is now building verifiable financial reputation."

**Action: Show Maria's credit profile:**
```
Puente Credit Score: 47 consecutive on-time payments
Tanda history: 4 completed, 1 active
Reliability: 100%
```

---

## [2:45–3:00] THE CLOSE

*[Put both phones down. Look at the room.]*

> "Carlos sent $500. Maria received $497.50 worth of pesos. In four seconds."

> "Last year, if Carlos used Western Union every week, he would have lost over $2,000 to fees."

> "With Puente, he loses $130. He keeps $1,870."

> "That is a semester at Universidad Autonoma Benito Juarez."

> "That is what this is about."

*[Pause.]*

> "Puente. Sin fronteras. Sin comisiones abusivas."

---

## DEMO CONTINGENCY

If live demo fails:

1. Pre-recorded screen capture ready as backup (60s version)
2. Stellar testnet transactions pre-confirmed — show explorer links
3. Static screenshots of each flow step loaded in slide deck

**Test checklist before going on stage:**
- [ ] Both phones charged above 80%
- [ ] Stellar testnet funded with test USDC
- [ ] OXXO QR generation endpoint live
- [ ] Wi-Fi tested at venue (have mobile hotspot as backup)
- [ ] Demo wallet pre-loaded with transaction history
