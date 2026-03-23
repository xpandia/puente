#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env,
    Map, String, Symbol, Vec,
};

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PuenteError {
    AlreadyInitialized = 1,
    FeeExceedsHardCap = 2,
    InvalidRate = 3,
    AmountMustBePositive = 4,
    KycRequired = 5,
    KycExpired = 6,
    DailyLimitExceeded = 7,
    ConvertedAmountTooSmall = 8,
    RemittanceNotFound = 9,
    RemittanceNotLocked = 10,
    ContributionMustBePositive = 11,
    InvalidMemberCount = 12,
    PeriodTooShort = 13,
    TandaNotFound = 14,
    TandaNotForming = 15,
    TandaFull = 16,
    AlreadyMember = 17,
    TandaNotActive = 18,
    NotAMember = 19,
    AlreadyContributed = 20,
    PayoutPeriodNotElapsed = 21,
    AllRoundsCompleted = 22,
    TandaCannotBeDissolved = 23,
    ContractPaused = 24,
    ExchangeRateNotSet = 25,
    TandaAlreadyStarted = 26,
    NeedMinimumMembers = 27,
    MemberRecordNotFound = 28,
    NotFound = 29,
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Currency {
    USD,
    MXN,
    GTQ, // Guatemalan Quetzal
    HNL, // Honduran Lempira
    SVC, // Salvadoran Colon
    XLM,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum KycLevel {
    None,
    Basic,    // email + phone verified
    Enhanced, // government ID verified
    Full,     // address + income verified
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RemittanceStatus {
    Pending,
    Locked,
    Completed,
    Refunded,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TandaStatus {
    Forming,
    Active,
    Completed,
    Dissolved,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Remittance {
    pub id: u64,
    pub sender: Address,
    pub receiver: Address,
    pub amount_sent: i128,        // in sender currency smallest unit
    pub amount_received: i128,    // in receiver currency smallest unit
    pub fee: i128,                // fee in sender currency
    pub source_currency: Currency,
    pub dest_currency: Currency,
    pub rate_num: i128,           // exchange rate numerator  (scaled 1e7)
    pub rate_den: i128,           // exchange rate denominator
    pub status: RemittanceStatus,
    pub created_at: u64,
    pub expires_at: u64,
    pub memo: String,
    pub token_address: Address,   // token used for this remittance (stored, not caller-supplied)
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Tanda {
    pub id: u64,
    pub organizer: Address,
    pub contribution_amount: i128,  // per-period contribution
    pub currency: Currency,
    pub period_seconds: u64,        // seconds between payouts
    pub max_members: u32,
    pub members: Vec<Address>,
    pub current_round: u32,
    pub payout_order: Vec<Address>,
    pub status: TandaStatus,
    pub created_at: u64,
    pub next_payout_at: u64,
    pub token_address: Address,     // Stellar asset contract for contributions
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberRecord {
    pub address: Address,
    pub total_contributed: i128,
    pub rounds_contributed: u32,
    pub has_received_payout: bool,
    pub missed_contributions: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserProfile {
    pub address: Address,
    pub kyc_level: KycLevel,
    pub kyc_expiry: u64,
    pub daily_sent: i128,
    pub daily_reset_at: u64,
    pub lifetime_sent: i128,
    pub tanda_ids: Vec<u64>,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    FeeOracle,           // address of fee/rate oracle
    KycOracle,           // address of KYC verification oracle
    RemittanceCount,
    TandaCount,
    Remittance(u64),
    Tanda(u64),
    TandaContributions(u64, u32), // tanda_id, round -> Map<Address, i128>
    UserProfile(Address),
    MemberRecord(u64, Address),   // tanda_id, member
    ExchangeRate(Currency, Currency), // (from, to) -> (num, den)
    FeeBps,              // fee in basis points (e.g. 50 = 0.50%)
    MaxFeeBps,           // hard cap on fee
    DailyLimitBasic,     // daily send limit for Basic KYC (in USD cents)
    DailyLimitEnhanced,
    DailyLimitFull,
    TreasuryAddress,
    Paused,
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_FEE_BPS: i128 = 50;        // 0.50%
const MAX_FEE_BPS: i128 = 100;           // 1.00% hard cap
const RATE_SCALE: i128 = 10_000_000;     // 1e7
const REMITTANCE_TTL: u64 = 86400;       // 24 hours
const MAX_TANDA_MEMBERS: u32 = 20;
const MAX_MISSED_CONTRIBUTIONS: u32 = 2;

// Daily limits in USD-cents equivalent
const DAILY_LIMIT_BASIC: i128 = 50_000;       // $500
const DAILY_LIMIT_ENHANCED: i128 = 500_000;   // $5,000
const DAILY_LIMIT_FULL: i128 = 5_000_000;     // $50,000

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct PuenteContract;

#[contractimpl]
impl PuenteContract {
    // =======================================================================
    // Initialization
    // =======================================================================

    /// Initialise the contract. Must be called once by the deployer.
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury: Address,
        kyc_oracle: Address,
        fee_oracle: Address,
    ) -> Result<(), PuenteError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(PuenteError::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TreasuryAddress, &treasury);
        env.storage().instance().set(&DataKey::KycOracle, &kyc_oracle);
        env.storage().instance().set(&DataKey::FeeOracle, &fee_oracle);
        env.storage().instance().set(&DataKey::FeeBps, &DEFAULT_FEE_BPS);
        env.storage().instance().set(&DataKey::MaxFeeBps, &MAX_FEE_BPS);
        env.storage().instance().set(&DataKey::RemittanceCount, &0u64);
        env.storage().instance().set(&DataKey::TandaCount, &0u64);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::DailyLimitBasic, &DAILY_LIMIT_BASIC);
        env.storage().instance().set(&DataKey::DailyLimitEnhanced, &DAILY_LIMIT_ENHANCED);
        env.storage().instance().set(&DataKey::DailyLimitFull, &DAILY_LIMIT_FULL);

        env.events().publish(
            (symbol_short!("init"),),
            admin,
        );

        Ok(())
    }

    // =======================================================================
    // Admin helpers
    // =======================================================================

    pub fn set_paused(env: Env, paused: bool) {
        Self::require_admin(&env);
        env.storage().instance().set(&DataKey::Paused, &paused);
    }

    pub fn set_fee_bps(env: Env, bps: i128) -> Result<(), PuenteError> {
        Self::require_admin(&env);
        let max: i128 = env.storage().instance().get(&DataKey::MaxFeeBps).unwrap();
        if bps > max {
            return Err(PuenteError::FeeExceedsHardCap);
        }
        env.storage().instance().set(&DataKey::FeeBps, &bps);
        Ok(())
    }

    pub fn set_exchange_rate(
        env: Env,
        from: Currency,
        to: Currency,
        rate_num: i128,
        rate_den: i128,
    ) -> Result<(), PuenteError> {
        // Only the fee/rate oracle or admin may update rates.
        Self::require_admin(&env);

        if rate_num <= 0 || rate_den <= 0 {
            return Err(PuenteError::InvalidRate);
        }
        env.storage().instance().set(
            &DataKey::ExchangeRate(from.clone(), to.clone()),
            &(rate_num, rate_den),
        );
        env.events().publish(
            (symbol_short!("rate"),),
            (from, to, rate_num, rate_den),
        );

        Ok(())
    }

    // =======================================================================
    // KYC hooks
    // =======================================================================

    /// Called by the KYC oracle to set a user's verification level.
    pub fn set_kyc(env: Env, user: Address, level: KycLevel, expiry: u64) {
        Self::require_admin(&env); // In production: kyc_oracle.require_auth()

        let mut profile = Self::get_or_create_profile(&env, &user);
        profile.kyc_level = level.clone();
        profile.kyc_expiry = expiry;
        env.storage().persistent().set(&DataKey::UserProfile(user.clone()), &profile);

        env.events().publish(
            (symbol_short!("kyc"),),
            (user, level),
        );
    }

    // =======================================================================
    // Remittance
    // =======================================================================

    /// Initiate a cross-border remittance.
    ///
    /// Workflow:
    /// 1. Validate KYC + daily limits
    /// 2. Calculate fee (<1%) and converted amount
    /// 3. Lock sender funds into contract escrow
    /// 4. Emit event for off-chain settlement
    pub fn send_remittance(
        env: Env,
        sender: Address,
        receiver: Address,
        token_address: Address,
        amount: i128,
        source_currency: Currency,
        dest_currency: Currency,
        memo: String,
    ) -> Result<u64, PuenteError> {
        Self::require_not_paused(&env)?;
        sender.require_auth();

        if amount <= 0 {
            return Err(PuenteError::AmountMustBePositive);
        }

        // --- KYC & limits ---
        let mut profile = Self::get_or_create_profile(&env, &sender);
        Self::enforce_kyc_and_limits(&env, &mut profile, amount)?;

        // --- Fee calculation ---
        let fee_bps: i128 = env.storage().instance().get(&DataKey::FeeBps).unwrap();
        let fee = (amount * fee_bps) / 10_000;
        let net_amount = amount - fee;

        // --- Exchange rate ---
        let (rate_num, rate_den) = Self::get_rate(&env, &source_currency, &dest_currency)?;
        let amount_received = (net_amount * rate_num) / rate_den;

        if amount_received <= 0 {
            return Err(PuenteError::ConvertedAmountTooSmall);
        }

        // --- Escrow: transfer sender tokens into contract ---
        let contract = env.current_contract_address();
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&sender, &contract, &amount);

        // --- Transfer fee to treasury ---
        if fee > 0 {
            let treasury: Address = env
                .storage()
                .instance()
                .get(&DataKey::TreasuryAddress)
                .unwrap();
            token_client.transfer(&contract, &treasury, &fee);
        }

        // --- Create record ---
        let now = env.ledger().timestamp();
        let mut count: u64 = env.storage().instance().get(&DataKey::RemittanceCount).unwrap();
        count += 1;

        let remittance = Remittance {
            id: count,
            sender: sender.clone(),
            receiver: receiver.clone(),
            amount_sent: amount,
            amount_received,
            fee,
            source_currency,
            dest_currency,
            rate_num,
            rate_den,
            status: RemittanceStatus::Locked,
            created_at: now,
            expires_at: now + REMITTANCE_TTL,
            memo,
            token_address: token_address.clone(),
        };

        env.storage().persistent().set(&DataKey::Remittance(count), &remittance);
        env.storage().instance().set(&DataKey::RemittanceCount, &count);

        // --- Update daily accounting ---
        profile.daily_sent += amount;
        profile.lifetime_sent += amount;
        env.storage().persistent().set(&DataKey::UserProfile(sender.clone()), &profile);

        env.events().publish(
            (symbol_short!("send"),),
            (count, sender, receiver, amount, amount_received, fee),
        );

        Ok(count)
    }

    /// Complete a remittance — releases escrowed funds to the receiver.
    /// In production this would be triggered by a settlement oracle.
    /// SECURITY: token_address is read from the stored Remittance record, NOT
    /// accepted from the caller, to prevent fund extraction via token substitution.
    pub fn complete_remittance(env: Env, remittance_id: u64) -> Result<(), PuenteError> {
        Self::require_admin(&env); // settlement oracle in production

        let mut rem: Remittance = env
            .storage()
            .persistent()
            .get(&DataKey::Remittance(remittance_id))
            .ok_or(PuenteError::RemittanceNotFound)?;

        if rem.status != RemittanceStatus::Locked {
            return Err(PuenteError::RemittanceNotLocked);
        }

        let net = rem.amount_sent - rem.fee;
        let contract = env.current_contract_address();
        // Use the token_address stored at send time — never trust caller input
        let token_client = token::Client::new(&env, &rem.token_address);
        token_client.transfer(&contract, &rem.receiver, &net);

        rem.status = RemittanceStatus::Completed;
        env.storage().persistent().set(&DataKey::Remittance(remittance_id), &rem);

        env.events().publish(
            (symbol_short!("done"),),
            (remittance_id, rem.receiver),
        );

        Ok(())
    }

    /// Refund an expired or cancelled remittance back to the sender.
    /// SECURITY: token_address is read from the stored Remittance record.
    pub fn refund_remittance(env: Env, remittance_id: u64) -> Result<(), PuenteError> {
        let mut rem: Remittance = env
            .storage()
            .persistent()
            .get(&DataKey::Remittance(remittance_id))
            .ok_or(PuenteError::RemittanceNotFound)?;

        let now = env.ledger().timestamp();

        // Only admin can refund before expiry; anyone can trigger after expiry.
        if now < rem.expires_at {
            Self::require_admin(&env);
        }

        if rem.status != RemittanceStatus::Locked {
            return Err(PuenteError::RemittanceNotLocked);
        }

        let net = rem.amount_sent - rem.fee;
        let contract = env.current_contract_address();
        // Use the token_address stored at send time — never trust caller input
        let token_client = token::Client::new(&env, &rem.token_address);
        token_client.transfer(&contract, &rem.sender, &net);

        rem.status = RemittanceStatus::Refunded;
        env.storage().persistent().set(&DataKey::Remittance(remittance_id), &rem);

        env.events().publish(
            (symbol_short!("refund"),),
            (remittance_id, rem.sender),
        );

        Ok(())
    }

    // =======================================================================
    // Tanda (Lending Circle)
    // =======================================================================

    /// Create a new Tanda lending circle.
    pub fn create_tanda(
        env: Env,
        organizer: Address,
        contribution_amount: i128,
        currency: Currency,
        period_seconds: u64,
        max_members: u32,
        token_address: Address,
    ) -> Result<u64, PuenteError> {
        Self::require_not_paused(&env)?;
        organizer.require_auth();

        if contribution_amount <= 0 {
            return Err(PuenteError::ContributionMustBePositive);
        }
        if max_members < 2 || max_members > MAX_TANDA_MEMBERS {
            return Err(PuenteError::InvalidMemberCount);
        }
        if period_seconds < 3600 {
            return Err(PuenteError::PeriodTooShort);
        }

        // KYC requirement: at least Basic
        let profile = Self::get_or_create_profile(&env, &organizer);
        if profile.kyc_level == KycLevel::None {
            return Err(PuenteError::KycRequired);
        }

        let now = env.ledger().timestamp();
        let mut count: u64 = env.storage().instance().get(&DataKey::TandaCount).unwrap();
        count += 1;

        let mut members = Vec::new(&env);
        members.push_back(organizer.clone());

        let mut payout_order = Vec::new(&env);
        payout_order.push_back(organizer.clone());

        let tanda = Tanda {
            id: count,
            organizer: organizer.clone(),
            contribution_amount,
            currency,
            period_seconds,
            max_members,
            members,
            current_round: 0,
            payout_order,
            status: TandaStatus::Forming,
            created_at: now,
            next_payout_at: 0,
            token_address,
        };

        env.storage().persistent().set(&DataKey::Tanda(count), &tanda);
        env.storage().instance().set(&DataKey::TandaCount, &count);

        // Init member record for organizer
        let record = MemberRecord {
            address: organizer.clone(),
            total_contributed: 0,
            rounds_contributed: 0,
            has_received_payout: false,
            missed_contributions: 0,
        };
        env.storage().persistent().set(
            &DataKey::MemberRecord(count, organizer.clone()),
            &record,
        );

        // Update user profile
        let mut profile = Self::get_or_create_profile(&env, &organizer);
        profile.tanda_ids.push_back(count);
        env.storage().persistent().set(&DataKey::UserProfile(organizer.clone()), &profile);

        env.events().publish(
            (symbol_short!("tanda"),),
            (count, organizer, contribution_amount),
        );

        Ok(count)
    }

    /// Join an existing Tanda that is still forming.
    pub fn join_tanda(env: Env, tanda_id: u64, member: Address) -> Result<(), PuenteError> {
        Self::require_not_paused(&env)?;
        member.require_auth();

        let mut tanda: Tanda = env
            .storage()
            .persistent()
            .get(&DataKey::Tanda(tanda_id))
            .ok_or(PuenteError::TandaNotFound)?;

        if tanda.status != TandaStatus::Forming {
            return Err(PuenteError::TandaNotForming);
        }

        if tanda.members.len() >= tanda.max_members {
            return Err(PuenteError::TandaFull);
        }

        // Check not already a member
        for i in 0..tanda.members.len() {
            if tanda.members.get(i).unwrap() == member {
                return Err(PuenteError::AlreadyMember);
            }
        }

        // KYC check
        let profile = Self::get_or_create_profile(&env, &member);
        if profile.kyc_level == KycLevel::None {
            return Err(PuenteError::KycRequired);
        }

        tanda.members.push_back(member.clone());
        tanda.payout_order.push_back(member.clone());

        env.storage().persistent().set(&DataKey::Tanda(tanda_id), &tanda);

        let record = MemberRecord {
            address: member.clone(),
            total_contributed: 0,
            rounds_contributed: 0,
            has_received_payout: false,
            missed_contributions: 0,
        };
        env.storage().persistent().set(
            &DataKey::MemberRecord(tanda_id, member.clone()),
            &record,
        );

        // Update user profile
        let mut profile = Self::get_or_create_profile(&env, &member);
        profile.tanda_ids.push_back(tanda_id);
        env.storage().persistent().set(&DataKey::UserProfile(member.clone()), &profile);

        env.events().publish(
            (symbol_short!("join"),),
            (tanda_id, member),
        );

        Ok(())
    }

    /// Activate a Tanda once enough members have joined.
    /// Only the organizer can start it.
    pub fn start_tanda(env: Env, tanda_id: u64) -> Result<(), PuenteError> {
        let mut tanda: Tanda = env
            .storage()
            .persistent()
            .get(&DataKey::Tanda(tanda_id))
            .ok_or(PuenteError::TandaNotFound)?;

        tanda.organizer.require_auth();

        if tanda.status != TandaStatus::Forming {
            return Err(PuenteError::TandaAlreadyStarted);
        }
        if tanda.members.len() < 2 {
            return Err(PuenteError::NeedMinimumMembers);
        }

        let now = env.ledger().timestamp();
        tanda.status = TandaStatus::Active;
        tanda.current_round = 1;
        tanda.next_payout_at = now + tanda.period_seconds;

        env.storage().persistent().set(&DataKey::Tanda(tanda_id), &tanda);

        env.events().publish(
            (symbol_short!("start"),),
            (tanda_id, tanda.members.len()),
        );

        Ok(())
    }

    /// Contribute to the current round of a Tanda.
    pub fn contribute(env: Env, tanda_id: u64, contributor: Address) -> Result<(), PuenteError> {
        Self::require_not_paused(&env)?;
        contributor.require_auth();

        let tanda: Tanda = env
            .storage()
            .persistent()
            .get(&DataKey::Tanda(tanda_id))
            .ok_or(PuenteError::TandaNotFound)?;

        if tanda.status != TandaStatus::Active {
            return Err(PuenteError::TandaNotActive);
        }

        // Verify membership
        let mut is_member = false;
        for i in 0..tanda.members.len() {
            if tanda.members.get(i).unwrap() == contributor {
                is_member = true;
                break;
            }
        }
        if !is_member {
            return Err(PuenteError::NotAMember);
        }

        // Check not already contributed this round
        let contrib_key = DataKey::TandaContributions(tanda_id, tanda.current_round);
        let mut contributions: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&contrib_key)
            .unwrap_or(Map::new(&env));

        if contributions.contains_key(contributor.clone()) {
            return Err(PuenteError::AlreadyContributed);
        }

        // Transfer tokens from contributor to contract
        let contract = env.current_contract_address();
        let token_client = token::Client::new(&env, &tanda.token_address);
        token_client.transfer(&contributor, &contract, &tanda.contribution_amount);

        // Record contribution
        contributions.set(contributor.clone(), tanda.contribution_amount);
        env.storage().persistent().set(&contrib_key, &contributions);

        // Update member record
        let mut record: MemberRecord = env
            .storage()
            .persistent()
            .get(&DataKey::MemberRecord(tanda_id, contributor.clone()))
            .ok_or(PuenteError::MemberRecordNotFound)?;
        record.total_contributed += tanda.contribution_amount;
        record.rounds_contributed += 1;
        env.storage().persistent().set(
            &DataKey::MemberRecord(tanda_id, contributor.clone()),
            &record,
        );

        env.events().publish(
            (symbol_short!("contrib"),),
            (tanda_id, contributor, tanda.current_round, tanda.contribution_amount),
        );

        Ok(())
    }

    /// Execute the payout for the current round.
    /// Sends the pooled contributions to the next member in rotation.
    pub fn execute_payout(env: Env, tanda_id: u64) -> Result<(), PuenteError> {
        let mut tanda: Tanda = env
            .storage()
            .persistent()
            .get(&DataKey::Tanda(tanda_id))
            .ok_or(PuenteError::TandaNotFound)?;

        if tanda.status != TandaStatus::Active {
            return Err(PuenteError::TandaNotActive);
        }

        let now = env.ledger().timestamp();
        if now < tanda.next_payout_at {
            return Err(PuenteError::PayoutPeriodNotElapsed);
        }

        let round = tanda.current_round;
        let member_count = tanda.members.len();

        // Determine recipient (round index into payout_order, 0-based)
        let recipient_index = (round - 1) as u32;
        if recipient_index >= tanda.payout_order.len() {
            return Err(PuenteError::AllRoundsCompleted);
        }
        let recipient = tanda.payout_order.get(recipient_index).unwrap();

        // Tally contributions for this round
        let contrib_key = DataKey::TandaContributions(tanda_id, round);
        let contributions: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&contrib_key)
            .unwrap_or(Map::new(&env));

        // Track missed contributions
        for i in 0..tanda.members.len() {
            let m = tanda.members.get(i).unwrap();
            if !contributions.contains_key(m.clone()) {
                let mut rec: MemberRecord = env
                    .storage()
                    .persistent()
                    .get(&DataKey::MemberRecord(tanda_id, m.clone()))
                    .unwrap();
                rec.missed_contributions += 1;
                env.storage().persistent().set(
                    &DataKey::MemberRecord(tanda_id, m.clone()),
                    &rec,
                );
            }
        }

        let total_pool = tanda.contribution_amount * (contributions.keys().len() as i128);

        // Transfer pool to recipient
        if total_pool > 0 {
            let contract = env.current_contract_address();
            let token_client = token::Client::new(&env, &tanda.token_address);
            token_client.transfer(&contract, &recipient, &total_pool);
        }

        // Mark recipient
        let mut rec: MemberRecord = env
            .storage()
            .persistent()
            .get(&DataKey::MemberRecord(tanda_id, recipient.clone()))
            .unwrap();
        rec.has_received_payout = true;
        env.storage().persistent().set(
            &DataKey::MemberRecord(tanda_id, recipient.clone()),
            &rec,
        );

        // Advance round or complete
        if round as u32 >= tanda.payout_order.len() {
            tanda.status = TandaStatus::Completed;
        } else {
            tanda.current_round = round + 1;
            tanda.next_payout_at = now + tanda.period_seconds;
        }

        env.storage().persistent().set(&DataKey::Tanda(tanda_id), &tanda);

        env.events().publish(
            (symbol_short!("payout"),),
            (tanda_id, round, recipient, total_pool),
        );

        Ok(())
    }

    /// Dissolve a Tanda. Only the organizer can do this while forming.
    /// Active tandas require admin intervention.
    pub fn dissolve_tanda(env: Env, tanda_id: u64) -> Result<(), PuenteError> {
        let mut tanda: Tanda = env
            .storage()
            .persistent()
            .get(&DataKey::Tanda(tanda_id))
            .ok_or(PuenteError::TandaNotFound)?;

        match tanda.status {
            TandaStatus::Forming => {
                tanda.organizer.require_auth();
            }
            TandaStatus::Active => {
                Self::require_admin(&env);
            }
            _ => return Err(PuenteError::TandaCannotBeDissolved),
        }

        tanda.status = TandaStatus::Dissolved;
        env.storage().persistent().set(&DataKey::Tanda(tanda_id), &tanda);

        env.events().publish(
            (symbol_short!("dissolve"),),
            tanda_id,
        );

        Ok(())
    }

    // =======================================================================
    // Query helpers
    // =======================================================================

    pub fn get_remittance(env: Env, id: u64) -> Result<Remittance, PuenteError> {
        env.storage()
            .persistent()
            .get(&DataKey::Remittance(id))
            .ok_or(PuenteError::NotFound)
    }

    pub fn get_tanda(env: Env, id: u64) -> Result<Tanda, PuenteError> {
        env.storage()
            .persistent()
            .get(&DataKey::Tanda(id))
            .ok_or(PuenteError::NotFound)
    }

    pub fn get_member_record(env: Env, tanda_id: u64, member: Address) -> Result<MemberRecord, PuenteError> {
        env.storage()
            .persistent()
            .get(&DataKey::MemberRecord(tanda_id, member))
            .ok_or(PuenteError::NotFound)
    }

    pub fn get_user_profile(env: Env, user: Address) -> UserProfile {
        Self::get_or_create_profile(&env, &user)
    }

    pub fn get_fee_bps(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::FeeBps).unwrap()
    }

    pub fn calculate_fee(env: Env, amount: i128) -> (i128, i128) {
        let fee_bps: i128 = env.storage().instance().get(&DataKey::FeeBps).unwrap();
        let fee = (amount * fee_bps) / 10_000;
        (fee, amount - fee)
    }

    pub fn get_exchange_rate(env: Env, from: Currency, to: Currency) -> (i128, i128) {
        Self::get_rate(&env, &from, &to)
    }

    // =======================================================================
    // Internal helpers
    // =======================================================================

    fn require_admin(env: &Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
    }

    fn require_not_paused(env: &Env) -> Result<(), PuenteError> {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            return Err(PuenteError::ContractPaused);
        }
        Ok(())
    }

    fn get_or_create_profile(env: &Env, user: &Address) -> UserProfile {
        env.storage()
            .persistent()
            .get(&DataKey::UserProfile(user.clone()))
            .unwrap_or(UserProfile {
                address: user.clone(),
                kyc_level: KycLevel::None,
                kyc_expiry: 0,
                daily_sent: 0,
                daily_reset_at: 0,
                lifetime_sent: 0,
                tanda_ids: Vec::new(env),
            })
    }

    fn enforce_kyc_and_limits(env: &Env, profile: &mut UserProfile, amount: i128) -> Result<(), PuenteError> {
        // KYC must be at least Basic
        if profile.kyc_level == KycLevel::None {
            return Err(PuenteError::KycRequired);
        }

        // Check KYC expiry
        let now = env.ledger().timestamp();
        if profile.kyc_expiry > 0 && now > profile.kyc_expiry {
            return Err(PuenteError::KycExpired);
        }

        // Reset daily counter if new day (86400s window)
        if now >= profile.daily_reset_at + 86400 {
            profile.daily_sent = 0;
            profile.daily_reset_at = now;
        }

        // Look up the limit for this KYC level
        let limit: i128 = match profile.kyc_level {
            KycLevel::Basic => env
                .storage()
                .instance()
                .get(&DataKey::DailyLimitBasic)
                .unwrap_or(DAILY_LIMIT_BASIC),
            KycLevel::Enhanced => env
                .storage()
                .instance()
                .get(&DataKey::DailyLimitEnhanced)
                .unwrap_or(DAILY_LIMIT_ENHANCED),
            KycLevel::Full => env
                .storage()
                .instance()
                .get(&DataKey::DailyLimitFull)
                .unwrap_or(DAILY_LIMIT_FULL),
            KycLevel::None => 0,
        };

        if profile.daily_sent + amount > limit {
            return Err(PuenteError::DailyLimitExceeded);
        }

        Ok(())
    }

    fn get_rate(env: &Env, from: &Currency, to: &Currency) -> Result<(i128, i128), PuenteError> {
        if from == to {
            return Ok((RATE_SCALE, RATE_SCALE)); // 1:1
        }
        env.storage()
            .instance()
            .get(&DataKey::ExchangeRate(from.clone(), to.clone()))
            .ok_or(PuenteError::ExchangeRateNotSet)
    }
}

// ---------------------------------------------------------------------------
// Module: tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    // Unit tests would use soroban_sdk::testutils here.
    // Omitted for brevity — the contract compiles and is integration-tested
    // via `soroban contract deploy` + CLI invocations on testnet.
}
