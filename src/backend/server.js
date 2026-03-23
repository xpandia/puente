/**
 * Puente Backend — Cross-Border Remittances & Micro-Lending on Stellar
 *
 * Express.js server providing REST APIs for:
 *  - Remittance lifecycle (send, receive, track, refund)
 *  - Tanda (lending-circle) management
 *  - Exchange-rate aggregation
 *  - User profiles & KYC status
 *  - Fiat on/off-ramp stubs
 *  - Notification hooks
 */

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");
const winston = require("winston");
const {
  Keypair,
  Horizon,
} = require("@stellar/stellar-sdk");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 4000;

// --- SECURITY: JWT_SECRET must be set via environment variable. No fallback. ---
if (!process.env.JWT_SECRET) {
  console.error(
    "FATAL: JWT_SECRET environment variable is not set. Refusing to start with a hardcoded secret."
  );
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || "TESTNET";
const HORIZON_URL =
  process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL =
  process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID || "";
const FEE_BPS = parseInt(process.env.FEE_BPS || "50", 10); // 0.50%

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "puente-api" },
  transports: [new winston.transports.Console()],
});

// ---------------------------------------------------------------------------
// In-memory stores (replace with DB in production)
// ---------------------------------------------------------------------------

const users = new Map();
const remittances = new Map();
const tandas = new Map();
const notifications = new Map(); // userId -> [notification]
const exchangeRates = new Map(); // "USD/MXN" -> { rate, updatedAt }

// Seed some exchange rates
exchangeRates.set("USD/MXN", { rate: 17.15, updatedAt: Date.now() });
exchangeRates.set("MXN/USD", { rate: 0.0583, updatedAt: Date.now() });
exchangeRates.set("USD/GTQ", { rate: 7.75, updatedAt: Date.now() });
exchangeRates.set("USD/HNL", { rate: 24.8, updatedAt: Date.now() });
exchangeRates.set("USD/XLM", { rate: 8.33, updatedAt: Date.now() });
exchangeRates.set("XLM/USD", { rate: 0.12, updatedAt: Date.now() });
exchangeRates.set("XLM/MXN", { rate: 2.06, updatedAt: Date.now() });

// ---------------------------------------------------------------------------
// Stellar / Soroban helpers
// ---------------------------------------------------------------------------

const horizon = new Horizon.Server(HORIZON_URL);

// NOTE: All Stellar transaction signing MUST happen client-side (e.g. via
// Freighter wallet). The backend NEVER handles user private keys.
// Use the horizon instance for read-only operations (account lookup, tx
// verification, etc.).

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().min(8).max(20).required(),
    name: Joi.string().min(1).max(120).required(),
    stellarPublicKey: Joi.string().length(56).required(),
    country: Joi.string().length(2).required(),
  }),

  sendRemittance: Joi.object({
    receiverId: Joi.string().uuid().required(),
    amount: Joi.number().positive().precision(7).required(),
    sourceCurrency: Joi.string()
      .valid("USD", "MXN", "GTQ", "HNL", "SVC", "XLM")
      .required(),
    destCurrency: Joi.string()
      .valid("USD", "MXN", "GTQ", "HNL", "SVC", "XLM")
      .required(),
    memo: Joi.string().max(280).allow("").default(""),
  }),

  createTanda: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    contributionAmount: Joi.number().positive().required(),
    currency: Joi.string()
      .valid("USD", "MXN", "GTQ", "HNL", "SVC", "XLM")
      .required(),
    periodDays: Joi.number().integer().min(1).max(90).required(),
    maxMembers: Joi.number().integer().min(2).max(20).required(),
  }),

  updateKyc: Joi.object({
    level: Joi.string().valid("none", "basic", "enhanced", "full").required(),
    documentHash: Joi.string().max(128).optional(),
    expiresAt: Joi.date().iso().optional(),
  }),
};

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    maxAge: 86400,
  })
);
app.use(express.json({ limit: "100kb" }));

// Global rate limiter
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  })
);

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Auth middleware
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.sub;
    req.user = users.get(payload.sub);
    if (!req.user) return res.status(401).json({ error: "User not found" });
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Validate body helper
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }
    req.validated = value;
    next();
  };
}

// ---------------------------------------------------------------------------
// Routes — Health
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "puente-api",
    version: "1.0.0",
    network: STELLAR_NETWORK,
    contractId: CONTRACT_ID || "not-deployed",
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Routes — Auth / Users
// ---------------------------------------------------------------------------

app.post("/api/v1/auth/register", validate(schemas.register), (req, res) => {
  const data = req.validated;

  // Check duplicate email
  for (const [, u] of users) {
    if (u.email === data.email)
      return res.status(409).json({ error: "Email already registered" });
  }

  const id = uuidv4();
  const user = {
    id,
    ...data,
    kyc: { level: "none", documentHash: null, expiresAt: null },
    createdAt: new Date().toISOString(),
    dailySent: 0,
    dailyResetAt: Date.now(),
    lifetimeSent: 0,
    tandaIds: [],
  };
  users.set(id, user);

  const token = jwt.sign({ sub: id, email: data.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  logger.info("User registered", { userId: id, email: data.email });
  res.status(201).json({ user: sanitizeUser(user), token });
});

// --- Auth challenge: issue a random nonce for the client to sign ---
const authChallenges = new Map(); // stellarPublicKey -> { nonce, expiresAt }

app.post("/api/v1/auth/challenge", (req, res) => {
  const { stellarPublicKey } = req.body;
  if (!stellarPublicKey || stellarPublicKey.length !== 56) {
    return res.status(400).json({ error: "Valid stellarPublicKey required" });
  }

  // Generate a cryptographic nonce (32 bytes, hex-encoded)
  const crypto = require("crypto");
  const nonce = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5-minute window

  authChallenges.set(stellarPublicKey, { nonce, expiresAt });

  res.json({ nonce, expiresAt: new Date(expiresAt).toISOString() });
});

// --- Auth login: verify Stellar signature over the nonce ---
app.post("/api/v1/auth/login", (req, res) => {
  const { stellarPublicKey, signature } = req.body;
  if (!stellarPublicKey || !signature) {
    return res
      .status(400)
      .json({ error: "stellarPublicKey and signature required" });
  }

  // Retrieve and validate the challenge nonce
  const challenge = authChallenges.get(stellarPublicKey);
  if (!challenge) {
    return res
      .status(401)
      .json({ error: "No auth challenge found. Call /api/v1/auth/challenge first." });
  }
  if (Date.now() > challenge.expiresAt) {
    authChallenges.delete(stellarPublicKey);
    return res.status(401).json({ error: "Auth challenge expired. Request a new one." });
  }

  // Verify the Ed25519 signature using Stellar Keypair
  try {
    const keypair = Keypair.fromPublicKey(stellarPublicKey);
    const signatureBuffer = Buffer.from(signature, "base64");
    const nonceBuffer = Buffer.from(challenge.nonce, "utf8");

    if (!keypair.verify(nonceBuffer, signatureBuffer)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  } catch (err) {
    return res.status(401).json({ error: "Signature verification failed" });
  }

  // Signature valid — consume the challenge (one-time use)
  authChallenges.delete(stellarPublicKey);

  // Find the user by their public key
  let found = null;
  for (const [, u] of users) {
    if (u.stellarPublicKey === stellarPublicKey) {
      found = u;
      break;
    }
  }
  if (!found) {
    return res.status(401).json({ error: "User not registered" });
  }

  const token = jwt.sign(
    { sub: found.id, email: found.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  logger.info("User logged in via signature verification", { userId: found.id });
  res.json({ user: sanitizeUser(found), token });
});

app.get("/api/v1/users/me", authenticate, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// ---------------------------------------------------------------------------
// Routes — KYC
// ---------------------------------------------------------------------------

app.put(
  "/api/v1/users/me/kyc",
  authenticate,
  validate(schemas.updateKyc),
  (req, res) => {
    const data = req.validated;
    req.user.kyc = {
      level: data.level,
      documentHash: data.documentHash || null,
      expiresAt: data.expiresAt || null,
      verifiedAt: new Date().toISOString(),
    };
    users.set(req.userId, req.user);
    pushNotification(req.userId, `KYC updated to level: ${data.level}`);
    logger.info("KYC updated", { userId: req.userId, level: data.level });
    res.json({ kyc: req.user.kyc });
  }
);

app.get("/api/v1/users/me/kyc", authenticate, (req, res) => {
  res.json({ kyc: req.user.kyc });
});

// ---------------------------------------------------------------------------
// Routes — Exchange Rates
// ---------------------------------------------------------------------------

app.get("/api/v1/rates", (_req, res) => {
  const rates = {};
  for (const [pair, data] of exchangeRates) {
    rates[pair] = data;
  }
  res.json({ rates, feeBps: FEE_BPS });
});

app.get("/api/v1/rates/:from/:to", (req, res) => {
  const key = `${req.params.from.toUpperCase()}/${req.params.to.toUpperCase()}`;
  const data = exchangeRates.get(key);
  if (!data)
    return res.status(404).json({ error: `Rate not found for ${key}` });
  res.json({ pair: key, ...data, feeBps: FEE_BPS });
});

// Fee quote endpoint
app.get("/api/v1/rates/quote", (req, res) => {
  const { amount, from, to } = req.query;
  if (!amount || !from || !to)
    return res
      .status(400)
      .json({ error: "amount, from, and to query params required" });

  const key = `${from.toUpperCase()}/${to.toUpperCase()}`;
  const rateData = exchangeRates.get(key);
  if (!rateData)
    return res.status(404).json({ error: `Rate not found for ${key}` });

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0)
    return res.status(400).json({ error: "Invalid amount" });

  const fee = (amountNum * FEE_BPS) / 10000;
  const net = amountNum - fee;
  const converted = net * rateData.rate;

  res.json({
    pair: key,
    amount: amountNum,
    feeBps: FEE_BPS,
    feeAmount: parseFloat(fee.toFixed(7)),
    feePercent: `${(FEE_BPS / 100).toFixed(2)}%`,
    netAmount: parseFloat(net.toFixed(7)),
    rate: rateData.rate,
    convertedAmount: parseFloat(converted.toFixed(7)),
    destCurrency: to.toUpperCase(),
    traditionalFeeEstimate: parseFloat(
      ((amountNum * 700) / 10000).toFixed(2)
    ),
    savings: parseFloat(
      ((amountNum * (700 - FEE_BPS)) / 10000).toFixed(2)
    ),
  });
});

// ---------------------------------------------------------------------------
// Routes — Remittances
// ---------------------------------------------------------------------------

app.post(
  "/api/v1/remittances",
  authenticate,
  validate(schemas.sendRemittance),
  async (req, res) => {
    try {
      const data = req.validated;

      // KYC check
      if (req.user.kyc.level === "none") {
        return res
          .status(403)
          .json({ error: "KYC verification required to send remittances" });
      }

      // Daily limit enforcement
      const now = Date.now();
      if (now - req.user.dailyResetAt > 86400_000) {
        req.user.dailySent = 0;
        req.user.dailyResetAt = now;
      }
      const limits = { basic: 500, enhanced: 5000, full: 50000 };
      const limit = limits[req.user.kyc.level] || 0;
      if (req.user.dailySent + data.amount > limit) {
        return res.status(403).json({
          error: `Daily limit of $${limit} exceeded for KYC level: ${req.user.kyc.level}`,
        });
      }

      // Receiver lookup
      const receiver = users.get(data.receiverId);
      if (!receiver)
        return res.status(404).json({ error: "Receiver not found" });

      // Exchange rate
      const rateKey = `${data.sourceCurrency}/${data.destCurrency}`;
      const rateData = exchangeRates.get(rateKey);
      if (!rateData && data.sourceCurrency !== data.destCurrency) {
        return res
          .status(400)
          .json({ error: `Exchange rate not available for ${rateKey}` });
      }
      const rate = rateData ? rateData.rate : 1;

      // Fee calculation
      const fee = (data.amount * FEE_BPS) / 10000;
      const netAmount = data.amount - fee;
      const convertedAmount = netAmount * rate;

      const remittance = {
        id: uuidv4(),
        senderId: req.userId,
        senderPublicKey: req.user.stellarPublicKey,
        receiverId: data.receiverId,
        receiverPublicKey: receiver.stellarPublicKey,
        amount: data.amount,
        fee: parseFloat(fee.toFixed(7)),
        netAmount: parseFloat(netAmount.toFixed(7)),
        convertedAmount: parseFloat(convertedAmount.toFixed(7)),
        sourceCurrency: data.sourceCurrency,
        destCurrency: data.destCurrency,
        rate,
        feeBps: FEE_BPS,
        memo: data.memo,
        status: "pending",
        stellarTxHash: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      };

      remittances.set(remittance.id, remittance);

      // Update daily accounting
      req.user.dailySent += data.amount;
      req.user.lifetimeSent += data.amount;
      users.set(req.userId, req.user);

      // Notifications
      pushNotification(
        req.userId,
        `Remittance of ${data.amount} ${data.sourceCurrency} initiated to ${receiver.name}`
      );
      pushNotification(
        data.receiverId,
        `Incoming remittance of ${convertedAmount.toFixed(2)} ${data.destCurrency} from ${req.user.name}`
      );

      logger.info("Remittance created", {
        remittanceId: remittance.id,
        sender: req.userId,
        amount: data.amount,
        fee,
      });

      res.status(201).json({ remittance });
    } catch (err) {
      logger.error("Remittance creation failed", { error: err.message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get("/api/v1/remittances", authenticate, (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  let results = [];
  for (const [, r] of remittances) {
    if (r.senderId === req.userId || r.receiverId === req.userId) {
      if (!status || r.status === status) {
        results.push(r);
      }
    }
  }
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = results.length;
  results = results.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ remittances: results, total, limit: Number(limit), offset: Number(offset) });
});

app.get("/api/v1/remittances/:id", authenticate, (req, res) => {
  const r = remittances.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Remittance not found" });
  if (r.senderId !== req.userId && r.receiverId !== req.userId) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json({ remittance: r });
});

// Complete remittance (simulate settlement)
// SECURITY: Only the sender or an admin can settle a remittance.
// In production, this would be restricted to a settlement oracle / admin role.
app.post(
  "/api/v1/remittances/:id/complete",
  authenticate,
  async (req, res) => {
    const r = remittances.get(req.params.id);
    if (!r) return res.status(404).json({ error: "Remittance not found" });

    // Authorization: only the sender of this remittance can complete it
    if (r.senderId !== req.userId) {
      return res.status(403).json({ error: "Only the sender can complete this remittance" });
    }

    if (r.status !== "pending")
      return res.status(400).json({ error: `Cannot complete: status is ${r.status}` });

    r.status = "completed";
    r.completedAt = new Date().toISOString();
    r.stellarTxHash = `sim_${uuidv4().slice(0, 16)}`;
    remittances.set(r.id, r);

    pushNotification(r.senderId, `Remittance ${r.id.slice(0, 8)} completed.`);
    pushNotification(
      r.receiverId,
      `You received ${r.convertedAmount} ${r.destCurrency}.`
    );

    logger.info("Remittance completed", { remittanceId: r.id });
    res.json({ remittance: r });
  }
);

// Refund remittance
app.post("/api/v1/remittances/:id/refund", authenticate, (req, res) => {
  const r = remittances.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Remittance not found" });
  if (r.senderId !== req.userId)
    return res.status(403).json({ error: "Only sender can request refund" });
  if (r.status !== "pending")
    return res.status(400).json({ error: `Cannot refund: status is ${r.status}` });

  r.status = "refunded";
  r.completedAt = new Date().toISOString();
  remittances.set(r.id, r);

  // Reverse daily accounting
  req.user.dailySent = Math.max(0, req.user.dailySent - r.amount);
  users.set(req.userId, req.user);

  pushNotification(req.userId, `Remittance ${r.id.slice(0, 8)} refunded.`);
  logger.info("Remittance refunded", { remittanceId: r.id });
  res.json({ remittance: r });
});

// ---------------------------------------------------------------------------
// Routes — Tandas (Lending Circles)
// ---------------------------------------------------------------------------

app.post(
  "/api/v1/tandas",
  authenticate,
  validate(schemas.createTanda),
  (req, res) => {
    const data = req.validated;

    if (req.user.kyc.level === "none") {
      return res
        .status(403)
        .json({ error: "KYC verification required to create a tanda" });
    }

    const id = uuidv4();
    const tanda = {
      id,
      name: data.name,
      organizerId: req.userId,
      organizerName: req.user.name,
      contributionAmount: data.contributionAmount,
      currency: data.currency,
      periodDays: data.periodDays,
      maxMembers: data.maxMembers,
      members: [
        {
          userId: req.userId,
          name: req.user.name,
          joinedAt: new Date().toISOString(),
          totalContributed: 0,
          roundsContributed: 0,
          hasReceivedPayout: false,
          missedContributions: 0,
        },
      ],
      payoutOrder: [req.userId],
      currentRound: 0,
      status: "forming",
      createdAt: new Date().toISOString(),
      nextPayoutAt: null,
      contributions: {}, // round -> { userId: amount }
    };

    tandas.set(id, tanda);
    req.user.tandaIds.push(id);
    users.set(req.userId, req.user);

    logger.info("Tanda created", { tandaId: id, organizer: req.userId });
    res.status(201).json({ tanda: sanitizeTanda(tanda) });
  }
);

app.get("/api/v1/tandas", authenticate, (req, res) => {
  const { status } = req.query;
  const results = [];
  for (const [, t] of tandas) {
    const isMember = t.members.some((m) => m.userId === req.userId);
    if (isMember) {
      if (!status || t.status === status) {
        results.push(sanitizeTanda(t));
      }
    }
  }
  res.json({ tandas: results });
});

// Browse public tandas that are still forming
app.get("/api/v1/tandas/discover", authenticate, (req, res) => {
  const results = [];
  for (const [, t] of tandas) {
    if (t.status === "forming" && t.members.length < t.maxMembers) {
      results.push(sanitizeTanda(t));
    }
  }
  res.json({ tandas: results });
});

app.get("/api/v1/tandas/:id", authenticate, (req, res) => {
  const t = tandas.get(req.params.id);
  if (!t) return res.status(404).json({ error: "Tanda not found" });

  const isMember = t.members.some((m) => m.userId === req.userId);
  if (!isMember)
    return res.status(403).json({ error: "Not a member of this tanda" });

  res.json({ tanda: sanitizeTanda(t) });
});

app.post("/api/v1/tandas/:id/join", authenticate, (req, res) => {
  const t = tandas.get(req.params.id);
  if (!t) return res.status(404).json({ error: "Tanda not found" });

  if (t.status !== "forming")
    return res.status(400).json({ error: "Tanda is not accepting members" });
  if (t.members.length >= t.maxMembers)
    return res.status(400).json({ error: "Tanda is full" });
  if (t.members.some((m) => m.userId === req.userId))
    return res.status(409).json({ error: "Already a member" });
  if (req.user.kyc.level === "none")
    return res.status(403).json({ error: "KYC required to join tanda" });

  t.members.push({
    userId: req.userId,
    name: req.user.name,
    joinedAt: new Date().toISOString(),
    totalContributed: 0,
    roundsContributed: 0,
    hasReceivedPayout: false,
    missedContributions: 0,
  });
  t.payoutOrder.push(req.userId);
  tandas.set(t.id, t);

  req.user.tandaIds.push(t.id);
  users.set(req.userId, req.user);

  pushNotification(
    t.organizerId,
    `${req.user.name} joined your tanda "${t.name}"`
  );
  logger.info("Member joined tanda", {
    tandaId: t.id,
    userId: req.userId,
  });
  res.json({ tanda: sanitizeTanda(t) });
});

app.post("/api/v1/tandas/:id/start", authenticate, (req, res) => {
  const t = tandas.get(req.params.id);
  if (!t) return res.status(404).json({ error: "Tanda not found" });

  if (t.organizerId !== req.userId)
    return res.status(403).json({ error: "Only the organizer can start" });
  if (t.status !== "forming")
    return res.status(400).json({ error: "Tanda already started or dissolved" });
  if (t.members.length < 2)
    return res.status(400).json({ error: "Need at least 2 members" });

  t.status = "active";
  t.currentRound = 1;
  t.nextPayoutAt = new Date(
    Date.now() + t.periodDays * 86400_000
  ).toISOString();
  tandas.set(t.id, t);

  // Notify all members
  for (const m of t.members) {
    pushNotification(
      m.userId,
      `Tanda "${t.name}" is now active! Round 1 has begun.`
    );
  }

  logger.info("Tanda started", { tandaId: t.id });
  res.json({ tanda: sanitizeTanda(t) });
});

app.post("/api/v1/tandas/:id/contribute", authenticate, (req, res) => {
  const t = tandas.get(req.params.id);
  if (!t) return res.status(404).json({ error: "Tanda not found" });

  if (t.status !== "active")
    return res.status(400).json({ error: "Tanda is not active" });

  const member = t.members.find((m) => m.userId === req.userId);
  if (!member)
    return res.status(403).json({ error: "Not a member" });

  const roundKey = String(t.currentRound);
  if (!t.contributions[roundKey]) t.contributions[roundKey] = {};
  if (t.contributions[roundKey][req.userId])
    return res.status(409).json({ error: "Already contributed this round" });

  // Record contribution
  t.contributions[roundKey][req.userId] = {
    amount: t.contributionAmount,
    at: new Date().toISOString(),
  };
  member.totalContributed += t.contributionAmount;
  member.roundsContributed += 1;
  tandas.set(t.id, t);

  logger.info("Tanda contribution", {
    tandaId: t.id,
    userId: req.userId,
    round: t.currentRound,
    amount: t.contributionAmount,
  });
  res.json({
    contribution: {
      tandaId: t.id,
      round: t.currentRound,
      amount: t.contributionAmount,
      currency: t.currency,
    },
  });
});

app.post("/api/v1/tandas/:id/payout", authenticate, (req, res) => {
  const t = tandas.get(req.params.id);
  if (!t) return res.status(404).json({ error: "Tanda not found" });

  if (t.organizerId !== req.userId)
    return res.status(403).json({ error: "Only the organizer can trigger payout" });
  if (t.status !== "active")
    return res.status(400).json({ error: "Tanda is not active" });

  const now = new Date();
  if (t.nextPayoutAt && now < new Date(t.nextPayoutAt))
    return res.status(400).json({ error: "Payout period has not elapsed" });

  const round = t.currentRound;
  const recipientIndex = round - 1;
  if (recipientIndex >= t.payoutOrder.length) {
    t.status = "completed";
    tandas.set(t.id, t);
    return res.json({ message: "All rounds completed", tanda: sanitizeTanda(t) });
  }

  const recipientId = t.payoutOrder[recipientIndex];
  const roundKey = String(round);
  const contribs = t.contributions[roundKey] || {};
  const contributorCount = Object.keys(contribs).length;
  const totalPool = t.contributionAmount * contributorCount;

  // Track missed contributions
  for (const m of t.members) {
    if (!contribs[m.userId]) {
      m.missedContributions += 1;
    }
  }

  // Mark recipient
  const recipientMember = t.members.find((m) => m.userId === recipientId);
  if (recipientMember) recipientMember.hasReceivedPayout = true;

  // Advance round
  if (round >= t.payoutOrder.length) {
    t.status = "completed";
  } else {
    t.currentRound = round + 1;
    t.nextPayoutAt = new Date(
      Date.now() + t.periodDays * 86400_000
    ).toISOString();
  }
  tandas.set(t.id, t);

  // Notify
  const recipientUser = users.get(recipientId);
  if (recipientUser) {
    pushNotification(
      recipientId,
      `You received a payout of ${totalPool} ${t.currency} from tanda "${t.name}"`
    );
  }

  logger.info("Tanda payout", {
    tandaId: t.id,
    round,
    recipient: recipientId,
    pool: totalPool,
  });

  res.json({
    payout: {
      tandaId: t.id,
      round,
      recipientId,
      recipientName: recipientMember?.name,
      totalPool,
      currency: t.currency,
      contributors: contributorCount,
    },
    tanda: sanitizeTanda(t),
  });
});

// ---------------------------------------------------------------------------
// Routes — Transaction History
// ---------------------------------------------------------------------------

app.get("/api/v1/transactions", authenticate, (req, res) => {
  const { type: txType, limit = 50, offset = 0 } = req.query;

  let txs = [];

  // Remittances as transactions
  if (!txType || txType === "remittance") {
    for (const [, r] of remittances) {
      if (r.senderId === req.userId || r.receiverId === req.userId) {
        txs.push({
          id: r.id,
          type: "remittance",
          direction: r.senderId === req.userId ? "outgoing" : "incoming",
          amount: r.senderId === req.userId ? r.amount : r.convertedAmount,
          currency:
            r.senderId === req.userId ? r.sourceCurrency : r.destCurrency,
          counterparty:
            r.senderId === req.userId ? r.receiverId : r.senderId,
          status: r.status,
          fee: r.senderId === req.userId ? r.fee : 0,
          stellarTxHash: r.stellarTxHash,
          createdAt: r.createdAt,
        });
      }
    }
  }

  // Tanda contributions as transactions
  if (!txType || txType === "tanda") {
    for (const [, t] of tandas) {
      for (const [round, contribs] of Object.entries(t.contributions)) {
        if (contribs[req.userId]) {
          txs.push({
            id: `${t.id}-r${round}-${req.userId}`,
            type: "tanda_contribution",
            direction: "outgoing",
            amount: contribs[req.userId].amount,
            currency: t.currency,
            counterparty: t.name,
            status: "completed",
            fee: 0,
            createdAt: contribs[req.userId].at,
          });
        }
      }
    }
  }

  txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = txs.length;
  txs = txs.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ transactions: txs, total, limit: Number(limit), offset: Number(offset) });
});

// ---------------------------------------------------------------------------
// Routes — Fiat On/Off Ramp (Stubs)
// ---------------------------------------------------------------------------

app.post("/api/v1/ramp/onramp", authenticate, (req, res) => {
  const { amount, currency, paymentMethod } = req.body;
  if (!amount || !currency || !paymentMethod) {
    return res
      .status(400)
      .json({ error: "amount, currency, and paymentMethod required" });
  }

  // Stub: in production this integrates with a fiat gateway (e.g. MoneyGram Access, Tempo)
  const order = {
    id: uuidv4(),
    userId: req.userId,
    type: "onramp",
    amount,
    currency,
    paymentMethod,
    stellarAsset: "USDC",
    status: "processing",
    estimatedCompletion: new Date(Date.now() + 300_000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  logger.info("Onramp order created", { orderId: order.id });
  res.status(201).json({ order, note: "Stub: integrate fiat gateway in production" });
});

app.post("/api/v1/ramp/offramp", authenticate, (req, res) => {
  const { amount, currency, bankAccount } = req.body;
  if (!amount || !currency || !bankAccount) {
    return res
      .status(400)
      .json({ error: "amount, currency, and bankAccount required" });
  }

  const order = {
    id: uuidv4(),
    userId: req.userId,
    type: "offramp",
    amount,
    currency,
    bankAccount: bankAccount.slice(0, 4) + "****", // mask
    status: "processing",
    estimatedCompletion: new Date(Date.now() + 3600_000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  logger.info("Offramp order created", { orderId: order.id });
  res.status(201).json({ order, note: "Stub: integrate fiat gateway in production" });
});

// ---------------------------------------------------------------------------
// Routes — Notifications
// ---------------------------------------------------------------------------

app.get("/api/v1/notifications", authenticate, (req, res) => {
  const notes = notifications.get(req.userId) || [];
  res.json({ notifications: notes.slice(-50).reverse() });
});

app.post("/api/v1/notifications/read", authenticate, (req, res) => {
  const notes = notifications.get(req.userId) || [];
  for (const n of notes) n.read = true;
  notifications.set(req.userId, notes);
  res.json({ acknowledged: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    country: u.country,
    stellarPublicKey: u.stellarPublicKey,
    kyc: u.kyc,
    lifetimeSent: u.lifetimeSent,
    tandaIds: u.tandaIds,
    createdAt: u.createdAt,
  };
}

function sanitizeTanda(t) {
  const { contributions, ...rest } = t;
  return {
    ...rest,
    contributionsThisRound: t.contributions[String(t.currentRound)]
      ? Object.keys(t.contributions[String(t.currentRound)]).length
      : 0,
    totalMembers: t.members.length,
  };
}

function pushNotification(userId, message) {
  const notes = notifications.get(userId) || [];
  notes.push({
    id: uuidv4(),
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  notifications.set(userId, notes);
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

app.use((err, _req, res, _next) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  logger.info(`Puente API running on port ${PORT}`, {
    network: STELLAR_NETWORK,
    horizonUrl: HORIZON_URL,
    contractId: CONTRACT_ID || "not-deployed",
    feeBps: FEE_BPS,
  });
});

module.exports = app;
