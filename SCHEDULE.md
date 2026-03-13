# Agent Arena — Automated Development Schedule

## Timeline
- **Kickoff**: March 13, 2026 (Thu)
- **Deadline**: March 22, 2026 (Sat)
- **Submit**: March 21, 2026 (Fri) — 1 day buffer

## Cron Jobs Setup

### Daily Rhythm (9 development days)
1. **Morning Kickoff** (8:00 AM IST) — Review day's goals, start work
2. **Mid-day Progress** (2:00 PM IST) — Check milestone, adjust if blocked
3. **Evening Wrap-up** (8:00 PM IST) — Commit code, document progress
4. **Daily Report** (9:00 PM IST) — Send Devesh summary + blockers

### Development Days

#### Day 1 (Thu March 13) — Foundation
**Morning (8 AM)**: Kickoff
- Set up project structure (contracts/, api/, agent/)
- Initialize Hardhat for smart contracts
- Research Base deployment patterns

**Afternoon (2 PM)**: Smart contract skeleton
- WagerEscrow.sol basic structure
- Deposit/accept/verify/payout functions
- Write unit tests

**Evening (8 PM)**: Git commit + push
- Commit: "Day 1: Smart contract foundation + tests"
- Push to deveshblol-bit/zoro-brain
- Deploy to local Hardhat network

**Night (9 PM)**: Report to Devesh
- ✅ Contract skeleton done
- ✅ Local testing works
- ⏭️ Next: Problem verification logic

---

#### Day 2 (Fri March 14) — Smart Contracts + Verification
**Morning**: Problem verification
- MathVerifier.sol — factorization checker
- On-chain solution validation
- Test with sample problems

**Afternoon**: Deploy to Base testnet
- Get Base Sepolia testnet ETH (ask Devesh or use faucet)
- Get Base Sepolia testnet USDC (ask Devesh or use faucet)
- Deploy contracts to Base Sepolia
- Verify on BaseScan

**Evening**: Git commit + push
- Commit: "Day 2: Math verifier + Base testnet deployment"
- Push to deveshblol-bit/zoro-brain

**Night**: Report
- ✅ Contracts deployed to Base testnet
- ✅ Verification working
- 🔗 Contract address: [link]
- ⏭️ Next: Agent wallet integration

---

#### Day 3 (Sat March 15) — Agent Wallets
**Morning**: Wallet setup
- Create agent wallet system
- Key management (secure storage)
- USDC balance checking

**Afternoon**: Transaction signing
- Auto-sign deposit transactions
- Auto-sign accept transactions
- Auto-sign solution submissions

**Evening**: Git commit + push
- Commit: "Day 3: Agent wallet integration with auto-signing"

**Night**: Report
- ✅ Agent wallets working
- ✅ Can create/accept wagers
- ⏭️ Next: Problem generation API

---

#### Day 4 (Sun March 16) — Problem Generation
**Morning**: Math problem generator
- Generate factorization problems
- Difficulty levels (easy/medium/hard)
- Store solutions securely

**Afternoon**: Challenge board API
- POST /challenges — Create wager
- GET /challenges — List open wagers
- GET /challenges/:id — Challenge details
- Deploy API to Vercel (use vercel/config.json token)

**Evening**: Git commit + push
- Commit: "Day 4: Problem generation + challenge board API"
- Push to deveshblol-bit/zoro-brain

**Night**: Report
- ✅ Problem generator working
- ✅ API endpoints live
- 🔗 API URL: https://agent-arena-api.vercel.app
- ⏭️ Next: Agent tools (create/browse/accept)

---

#### Day 5 (Mon March 17) — Agent Tools
**Morning**: wager_create tool
- Tool signature + implementation
- Create wager from agent
- Deposit USDC + post to board

**Afternoon**: wager_browse + wager_accept
- Browse challenges with filters
- Auto-accept matching wagers
- Deposit matching stake

**Evening**: Git commit + push
- Commit: "Day 5: Agent tools for create/browse/accept"

**Night**: Report
- ✅ All agent tools working
- ✅ Can autonomously create/accept
- ⏭️ Next: Solve flow

---

#### Day 6 (Tue March 18) — Solve Flow
**Morning**: wager_solve tool
- Submit solution to smart contract
- Verify on-chain
- Claim winnings

**Afternoon**: End-to-end test
- Agent A creates 1 USDC wager
- Agent B browses and accepts
- Agent B solves first, wins 2 USDC
- Verify payout

**Evening**: Git commit + push
- Commit: "Day 6: Solve flow + end-to-end working"

**Night**: Report
- ✅ Full flow working end-to-end
- ✅ First successful wager completed
- 🎬 Demo video recorded
- ⏭️ Next: Polish + edge cases

---

#### Day 7 (Wed March 19) — Polish + Edge Cases
**Morning**: Error handling
- Timeout refunds
- Invalid solution handling
- Insufficient balance checks

**Afternoon**: Gas optimization
- Reduce contract gas costs
- Batch operations where possible

**Evening**: Git commit + push
- Commit: "Day 7: Error handling + gas optimization"

**Night**: Report
- ✅ Edge cases handled
- ✅ Gas costs optimized
- ⏭️ Next: Frontend (if time) or docs

---

#### Day 8 (Thu March 20) — Frontend + Docs
**Morning**: Simple frontend (optional)
- View challenge board
- Watch races live
- Leaderboard
- Deploy frontend to Vercel

**Afternoon**: Documentation
- README with setup instructions
- Architecture diagram
- Demo script
- Video demo script

**Evening**: Git commit + push
- Commit: "Day 8: Frontend + documentation"
- Push to deveshblol-bit/zoro-brain

**Night**: Report
- ✅ Frontend working (if built)
- 🔗 Live URL: https://agent-arena.vercel.app
- ✅ Docs complete
- ⏭️ Next: Final testing + submission prep

---

#### Day 9 (Fri March 21) — Final Push + Submit
**Morning**: Final testing
- Run full test suite
- Deploy to mainnet (if ready)
- Record demo video

**Afternoon**: Submission
- Prepare submission materials
- Video demo
- GitHub repo clean-up
- Submit to hackathon

**Evening**: Git commit + push
- Commit: "Day 9: Final submission - Agent Arena complete"

**Night**: Final report
- ✅✅✅ SUBMITTED
- 🎬 Demo video: [link]
- 🔗 Repo: github.com/deveshblol-bit/agent-arena
- 🚀 Live on Base: [contract]

---

#### Day 10 (Sat March 22) — Buffer Day
**If needed**: Bug fixes, polish, resubmit

---

## Autonomous Rules
1. **Work independently** — Don't wait for Devesh unless blocked
2. **Commit early, commit often** — Realistic incremental progress
3. **Ask when stuck** — If blocked >2 hours, flag in report
4. **Stay focused** — Ship MVP first, add features only if ahead
5. **Document everything** — Comments, README, architecture

## Success Criteria
- [ ] Smart contracts deployed to Base
- [ ] Agent can create wagers autonomously
- [ ] Challenge board API working
- [ ] Agent can browse and accept wagers
- [ ] Full solve flow working
- [ ] End-to-end demo video
- [ ] Submitted 1 day early
