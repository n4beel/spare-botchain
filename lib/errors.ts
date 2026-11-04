import { formatEther } from "viem";

export function describeError(err: unknown): string {
  if (!err) return "An unknown error occurred.";

  const errStr = typeof err === "object" ? JSON.stringify(err) : String(err);
  const msg = err instanceof Error ? err.message : String(err);

  if (
    msg.includes("User rejected") ||
    msg.includes("User denied") ||
    errStr.includes("UserRejectedRequestError")
  ) {
    return "Transaction cancelled in wallet.";
  }

  if (
    msg.includes("ConnectorChainMismatchError") ||
    errStr.includes("ConnectorChainMismatchError") ||
    msg.includes("chain mismatch")
  ) {
    return "Your wallet is on a different network. Switch it to BOT Chain, then try again.";
  }

  if (msg.includes("BadMerchant") || errStr.includes("BadMerchant")) {
    return "The merchant address cannot be zero or this contract.";
  }
  if (msg.includes("BadCause") || errStr.includes("BadCause")) {
    return "The cause can't be the merchant, you, or this contract.";
  }
  if (msg.includes("BadPrice") || errStr.includes("BadPrice")) {
    return "The price must be positive and at most 1,000,000 BOT.";
  }
  if (msg.includes("BadUnit") || errStr.includes("BadUnit")) {
    return "Pick a unit between 0.001 and 1000 BOT.";
  }
  if (msg.includes("BadName") || errStr.includes("BadName")) {
    return "The cause name must be between 1 and 40 bytes.";
  }
  if (msg.includes("MemoTooLong") || errStr.includes("MemoTooLong")) {
    return "The memo cannot exceed 64 bytes.";
  }
  if (msg.includes("WrongPayment") || errStr.includes("WrongPayment")) {
    const match =
      msg.match(/expected:\s*(\d+)/i) ||
      msg.match(/WrongPayment\((\d+)\)/i) ||
      errStr.match(/"expected":\s*"?(\d+)"?/i) ||
      errStr.match(/WrongPayment\((\d+)\)/i);
    if (match && (match[1] || match[2])) {
      const valStr = match[1] || match[2];
      const ethVal = formatEther(BigInt(valStr));
      return `The total is ${ethVal} BOT. Quote again.`;
    }
    return "The payment amount does not match the quoted total.";
  }
  if (msg.includes("NothingToWithdraw") || errStr.includes("NothingToWithdraw")) {
    return "You have no pending balance to withdraw.";
  }
  if (msg.includes("TransferFailed") || errStr.includes("TransferFailed")) {
    return "BOT transfer failed.";
  }
  if (msg.includes("ReentrancyGuard") || errStr.includes("ReentrancyGuard")) {
    return "Reentrant call blocked.";
  }

  const shortMsg = (err as any).shortMessage || msg.slice(0, 100);
  return `The network refused this transaction. ${shortMsg}`;
}
