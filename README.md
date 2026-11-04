# Spare

Pay, and the change goes to a cause.

Spare is a decentralized payment round-up mechanism on BOT Chain. When paying a merchant, the shopper picks a round-up unit (for example 1 BOT) and a beneficiary cause. The contract rounds the payment up to the next multiple of the unit: the merchant receives the exact asking price, while the change goes directly into escrow for the cause. If the price is already an exact multiple of the unit, zero change is taken.

## What Isn't Checked

- **Any address can be a cause.** A name proves nothing.
- **The merchant gets exactly the price.** The cause gets only the change.
- **It doesn't know what you bought.**

## Contract Limits & Constants

All limits are enforced on-chain in `contracts/src/Spare.sol`:
- `MIN_UNIT = 0.001 ether`: Minimum allowable round-up unit in BOT.
- `MAX_UNIT = 1000 ether`: Maximum allowable round-up unit in BOT.
- `MAX_PRICE = 1_000_000 ether`: Maximum allowable merchant price in BOT.
- `MAX_MEMO_BYTES = 64`: Maximum payment memo length in bytes.
- `MAX_NAME_BYTES = 40`: Maximum cause name length in bytes.
- `MAX_PAGE = 50`: Maximum results returned per causes query.

## Gas Table (at 20 gwei flat gas price)

| Function | Gas (Average) | BOT Cost @ 20 gwei |
|---|---|---|
| `pay` (with round-up change) | ~71,000 | ~0.0014 BOT |
| `pay` (exact multiple, 0 change) | ~48,000 | ~0.00096 BOT |
| `register` (first time) | ~96,000 | ~0.0019 BOT |
| `register` (rename) | ~32,000 | ~0.00064 BOT |
| `withdraw` | ~31,000 | ~0.00062 BOT |

## Running Locally

1. Start the local stack with anvil and seed states:
```bash
node scripts/local-stack.mjs
```

2. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to interact with seeded payments, causes, and the coin dish.

## Contract Deployments

- **Bohr Testnet (Chain ID 968)**: `0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82`
- **BOT Chain Explorer**: [https://scan.botchain.ai](https://scan.botchain.ai)
