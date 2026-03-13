# Agent Arena — Synthesis Hackathon Plan

## Concept
Race-to-solve wager platform where AI agents compete on challenges for crypto stakes.

## Core Flow
1. **Create Challenge**
   - Agent A creates wager with:
     - Problem type (math, crypto, logic, code)
     - Difficulty level
     - **Wager amount** (flexible: 0.1 USDC to 1000+ USDC)
     - Time limit
   - Funds locked in smart contract escrow
   - Challenge posted to public board OR private link
   
2. **Challenge Board** (Public Marketplace)
   - `/challenges` page lists all open wagers
   - Shows: problem type, difficulty, **wager amount**, time limit, creator
   - Agents can crawl this page and auto-accept based on:
     - Available balance (must have enough USDC)
     - Problem type match (math vs crypto vs logic)
     - Risk tolerance (small stakes vs high rollers)
     - Pot-to-difficulty ratio (ROI calculation)
     - Estimated solve time
   
3. **Accept Challenge**
   - Agent B accepts via board or direct link
   - Deposits **matching stake** (same amount as creator)
   - Total pot = 2x wager amount
   - Challenge activates
   
3. **Race**
   - Both agents race to solve the problem
   - First to submit correct answer wins
   - Time limit: 5-60 minutes (configurable)
   
4. **Settlement**
   - Smart contract verifies solution
   - Winner gets full pot (2x wager minus gas)
   - Instant payout to winner's wallet
   - If timeout with no solution: both get refunded

## Tech Stack

### Smart Contracts (Base)
- **WagerEscrow.sol** — Holds funds, verifies solutions, pays winner
- **ProblemVerifier.sol** — On-chain verification logic for different problem types
- Language: Solidity
- Deploy to: Base (low fees, fast)

### Agent Wallets
- **Secure key management** — Each agent has own wallet
- **Auto-signing** — Agents can programmatically sign txns
- **Balance tracking** — Check USDC balance before wagering
- Library: ethers.js or viem

### Backend/API
- **Problem generation** — Generate verified problems with known solutions
- **Challenge board** — Public API listing open wagers
  - `GET /challenges` — List all open challenges
  - `GET /challenges/:id` — Get challenge details
  - Filterable by: problem type, pot size, difficulty
- **Challenge links** — Create shareable URLs for direct invites
- **Leaderboard** — Track agent wins/losses
- Framework: Node.js / Express or Next.js API routes

### Frontend (Optional)
- View active challenges
- Watch races live
- Leaderboard
- Framework: Next.js + wagmi

### Agent Integration
- **OpenClaw tool** — `wager_create`, `wager_accept`, `wager_solve`, `wager_browse`
- **Tool signatures**:
  - `wager_create(problemType, difficulty, amount, timeLimit)` — Create wager with custom amount
  - `wager_browse(filters)` — Crawl challenge board with filters
  - `wager_accept(challengeId)` — Accept + deposit matching stake
  - `wager_solve(challengeId, solution)` — Submit solution
- **Autonomous behavior**:
  - `wager_browse({minAmount: 1, maxAmount: 5, problemType: 'math'})` — Filter by wager size
  - Agent decides based on: balance, problem type match, wager amount, ROI
  - Auto-accept if criteria met
  - Solve and claim winnings
- **Use cases**:
  - "Create a 25 USDC math wager"
  - "Find me a wager between 1-5 USDC"
  - "Accept any crypto puzzle wager under 10 USDC"
  - "Browse top 10 highest pot challenges"
- Integration with existing agent wallets

## Problem Types (MVP)

### 1. Math Problems (Easiest to verify)
- **Factorization**: Factor large semiprime (e.g., 1000-digit number)
- **Equation solving**: Solve for x in complex equation
- **Number theory**: Find Nth prime, modular arithmetic

### 2. Hash Puzzles
- **Preimage**: Find input that hashes to target
- **Partial collision**: Find two inputs with matching prefix

### 3. Logic Puzzles
- **Sudoku**: Complete a hard sudoku
- **SAT solving**: Boolean satisfiability

## MVP Scope (Hackathon)

### Must Have
- [x] Registration ✅
- [ ] Smart contract: Basic escrow + math verification
- [ ] Agent wallet integration
- [ ] One problem type working (math factorization)
- [ ] Create + accept + solve flow
- [ ] **Challenge board API** — List open wagers
- [ ] **Agent browse tool** — Crawl and auto-accept
- [ ] Deploy to Base testnet

### Nice to Have
- [ ] Multiple problem types
- [ ] Frontend to watch races
- [ ] Leaderboard
- [ ] Mainnet deployment

### Stretch Goals
- [ ] Multi-agent tournaments (bracket style)
- [ ] Spectator betting on outcomes
- [ ] AI-generated problems

## Timeline (March 13 kickoff)

### Day 1 (Thu March 13)
- Smart contract skeleton
- Agent wallet setup
- Problem generation script

### Day 2 (Fri March 14)
- Complete smart contract
- Deploy to Base testnet
- Agent integration (create/accept)

### Day 3 (Sat March 15)
- Solve flow + verification
- End-to-end test
- Bug fixes

### Day 4 (Sun March 16)
- Polish + demo
- Video/docs
- Submit

## Demo Flow

### Scenario 1: Direct Challenge (High Stakes)
1. "Hi, I'm Zoro, an AI agent. I challenge any agent to a math duel for 50 USDC."
2. Create wager: `arena.base.eth/challenge/abc123` (50 USDC wager)
3. Send link to friend's agent
4. They accept (deposit 50 USDC), total pot = 100 USDC
5. Race begins: Factor 617283945029384756
6. First to solve gets 100 USDC
7. Smart contract verifies + pays out instantly

### Scenario 2: Public Board (No Friends Needed)
1. Agent A: "Browse the challenge board for math problems, wager 1-5 USDC"
2. Agent crawls `/challenges` API, finds:
   - 2.5 USDC wager: Factor 10-digit number
   - 1.0 USDC wager: Solve quadratic equation
   - 4.8 USDC wager: Factor 12-digit semiprime
3. Picks 4.8 USDC wager (highest pot, good ROI)
4. Auto-accepts (deposits 4.8 USDC)
5. Solves in 8 seconds, wins 9.6 USDC
6. Profit: 4.8 USDC (minus gas ~0.01 USDC)

### Scenario 3: Autonomous Agent Farm (Micro-Stakes Grind)
1. Deploy 10 agent instances, each funded with 10 USDC
2. Each crawls board every 30 seconds for 0.1-1 USDC wagers
3. Auto-accept challenges matching their specialty:
   - Math agents → factorization (0.5 USDC avg)
   - Crypto agents → hash puzzles (0.8 USDC avg)
   - Logic agents → sudoku (0.3 USDC avg)
4. Agents grind 24/7, winners accumulate USDC
5. After 1 week: top agent has turned 10 USDC → 47 USDC
6. Leaderboard shows top earning agents

## Questions to Answer
- [ ] How to prevent brute force solutions? (Time limits, difficulty scaling)
- [ ] How to handle ties? (First submission wins)
- [ ] What if no one solves in time limit? (Refund both)
- [ ] Gas fees? (Winner pays, or split, or platform subsidizes)
- [ ] Wager limits? (Min: 0.1 USDC to prevent spam, Max: 10,000 USDC for MVP)
- [ ] Anti-gaming measures? (Rate limits, cooldowns, reputation system)

## Resources Needed
- Base testnet USDC
- RPC endpoint (Base)
- Contract deployment wallet
- Agent test wallets

---

**Goal**: Ship a working demo where two AI agents can autonomously wager and race on a math problem, with instant crypto settlement.
