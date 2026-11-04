# Spare Architecture Decisions

## 1. Context and Problem Statement
Spare is a round-up payment splitter contract on BOT Chain. When a customer pays a merchant, they specify a round-up unit (e.g. 1 BOT) and a designated cause. The contract rounds the price up to the next multiple of the unit, paying the merchant the exact price and directing the change (the spare) to the cause.

## 2. Key Design Decisions

### 2.1 Round-Up Change Formula
- **Formula**: `spare(price, unit) = ((price + unit - 1) / unit) * unit - price`
- Implemented in Solidity cleanly as:
  ```solidity
  uint256 rem = uint256(price) % uint256(unit);
  if (rem == 0) return 0;
  return uint128(uint256(unit) - rem);
  ```
- **Why**: Guarantees that when `price` is already an exact multiple of `unit`, `spare` is exactly 0 and no change is taken. If not a multiple, `0 < spare < unit` and `price + spare` is an exact multiple of `unit`.

### 2.2 Pull Payment Pattern for Both Merchant and Cause
- **Decision**: All payments credit `pending[merchant]` and `pending[cause]`. Recipients call `withdraw()` to pull funds.
- **Why**: If payments pushed native BOT directly to either merchant or cause, a reverting contract or out-of-gas recipient could brick payments for the customer or lock merchant funds. Pull payments isolate recipient external calls completely.

### 2.3 Transparent On-Chain Tallies (`given` and `received`)
- **Decision**: The contract maintains `mapping(address => uint256) public given` and `mapping(address => uint256) public received`.
- **Why**: Allows payers to verifiably track total giving across all purchases and causes to display cumulative community impact on-chain without indexing large blocks of historical event logs.

### 2.4 Self-Registration for Cause Directories
- **Decision**: Any wallet address can label itself as a cause using `register(string name)` (up to 40 bytes). No admin vetting exists.
- **Why**: Retains decentralization and permissionless usability on BOT Chain while allowing recognizable names in the UI.

## 3. Risks Accepted & Mitigations
- **Unverified Cause Legitimateness**: Any address can register a name or receive change. The UI prominently features the "What isn't checked" limitation block explaining that names do not prove real-world authenticity.
