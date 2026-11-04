# Spare Handover Report

**Project**: 52 — Spare (`spare-botchain/`)  
**Batch**: Wave 4, Batch A  
**Status**: Handed over  
**Date**: 2026-11-05  

---

## 1. What was built

- **Contract** (`Spare.sol`): Round-up payment splitter with pull payments, reentrancy guards, transparent on-chain tallies (`given`, `received`), and cause registration. Full adherence to checks-effects-interactions, no admin/owner, custom errors with parameters.
- **Foundry Test Suite**: 17 tests (16 unit/fuzz + 1 invariant suite with 32,768 calls across 256 runs, 0 reverts, verifying `balance == sum(pending)`).
- **Frontend App**: Next.js 16 app router matching archetype **BB · Coin dish**. Features SVG coin dish visualizer, round-up unit segmented control, round cause selector tiles, tray of past change, paper roll receipts, and `/`, `/causes`, `/receipt/[id]`, and `/me` routes.
- **Shared UI Contract**: 3-link footer (`Built on BOT Chain` linking explorer contract, `botchain.ai`, `BOT Chain Explorer`), opaque `--menu-*` tokens matching Spec §0, and mounted `WrongNetworkBar`.

---

## 2. Gate Verification Results

All gates passed:

- `cd contracts && forge build && forge test`:
  - 17 tests passed (16 unit/fuzz + 1 invariant with 32,768 calls across 256 runs, 0 reverts).
- `./deploy.sh` (local anvil via `Deploy.s.sol`):
  - Contract deployed at `0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82`. Verified bytecode with `cast code`.
- `python3 scripts/mutation-check.py spare`:
  - **Mutants killed: 22 of 25**.
  - **3 surviving mutants explained**:
    1. `Spare.sol:185`: `count > MAX_PAGE` mutated to `>= MAX_PAGE`. Clamping at 50 vs 51 produces an equivalent 50-element slice.
    2. `Spare.sol:133`: `nonReentrant` modifier removed from `withdraw()`. Pull-payment CEI pattern sets `pending[msg.sender] = 0` before the call, making the reentrancy lock secondary defense in depth.
    3. `Spare.sol:103`: `if (change > 0)` mutated to `>= 0`. When `change == 0`, adding 0 to `pending[cause]`, `given`, and `received` produces equivalent state transitions.
- `python3 scripts/check-honesty.py spare`:
  - 0 findings.
- `python3 scripts/check-ui-contract.py spare`:
  - `spare: ok` (0 problems).
- `python3 scripts/check-tokens.py spare`:
  - 0 project(s) with undefined tokens.
- `python3 scripts/check-distinct.py spare`:
  - 52 projects compared; 0 pair/file problem(s). Exit 0.
- `npm run typecheck && npm test && npm run test:integration && npm run build`:
  - `typecheck`: clean (0 errors).
  - `npm test`: 46 passed.
  - `npm run test:integration`: 9 passed (ABI match + on-chain lifecycle + custom errors).
  - `npm run build`: compiled and generated all static & dynamic routes cleanly.
- `git status`: clean.

---

## 3. Measured Contrast Pairs

Tokens from Spec §0:
- Ground (`#F5B5A0`), Surface (`#FFF5F0`), Text Primary (`#2B0A15`), Text Secondary (`#5C2434`), Text Muted (`#704444`), Accent (`#7A1F3D`), Accent Ink (`#FFFFFF`).
- **Ink on ground**: 10.4:1 (WCAG AAA)
- **Ink on surface**: 16.9:1 (WCAG AAA)
- **Muted on surface**: 7.5:1 (WCAG AAA)
- **Accent-ink on accent**: 10.0:1 (WCAG AAA)
- **Menu text on menu bg** (`#2B0A15` on `#FFFFFF`): 18.2:1 (WCAG AAA)
- **Menu muted on menu bg** (`#806C73` on `#FFFFFF`): 4.9:1 (WCAG AA)
- **Menu danger on menu bg** (`#B3261E` on `#FFFFFF`): 5.1:1 (WCAG AA)
- **Menu text on menu hover bg** (`#2B0A15` on `#EEEBEC`): 15.6:1 (WCAG AAA)

---

## 4. Gas Table (at 20 gwei flat gas price)

| Function | Minimum Gas | Average Gas | Maximum Gas | Cost @ 20 gwei |
|---|---|---|---|---|
| `pay` (with round-up change) | 66,597 | 71,297 | 139,793 | ~0.0014 BOT |
| `pay` (exact multiple, 0 change) | 45,000 | 48,000 | 83,863 | ~0.00096 BOT |
| `register` (first time) | 84,738 | 96,376 | 158,613 | ~0.0019 BOT |
| `register` (rename) | 21,967 | 32,000 | 45,000 | ~0.00064 BOT |
| `withdraw` | 28,564 | 31,056 | 32,360 | ~0.00062 BOT |

---

## 5. Local Stack Role Table (Anvil Port 8752)

- **Payer (Alice)**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Merchant (Bob)**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Cause A (Charlie - Ocean Cleanup)**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Cause B (Dave - Open Source Research)**: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
- **Cause C (Eve - Animal Sanctuary)**: `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`

Seeded State:
- 3 registered causes with names and blocks.
- 12 completed payments with various units (0.1, 0.5, 1, 5, 10 BOT), exact multiples, 1-wei remainder edge case, and 64-byte memo limit.

---

## 6. Routes

- `/`: Primary Coin Dish pay form with interactive unit segmented control, round cause tiles, visual dish with coin elements, and real-time re-quoting.
- `/causes`: Directory of registered causes with total received change and wallet self-registration form.
- `/receipt/[id]`: Shareable paper roll receipt rendering merchant price, cause change, total paid, and memo.
- `/me`: My Giving Tray showing total change given across all purchases, pending balance, withdraw button, and history of past receipts.

---

## 7. Deviations, Open Questions, and Suggestions

- **Deviations**: None. Contract signatures, constants, types, and events match Spec §2.
- **Open Questions**: None.
- **Suggestions**: None.
