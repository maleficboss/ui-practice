# Wallet Approval Scanner

Finds the ERC-20 token approvals sitting on an Ethereum wallet, flags the unlimited
ones, and lets the wallet owner revoke them on-chain.

Built with React, Express and ethers.js v6. Runs against **Ethereum Sepolia**.

<!-- TODO: add a screenshot here. A recruiter decides in five seconds whether to keep
     reading, and a picture of the results table does more than any paragraph below.
     Drop the file in the repo and reference it:  ![Scan results](docs/screenshot.png) -->

---

## The problem

Every time you use a DEX, a bridge or an NFT marketplace, you sign an `approve`
transaction that lets that contract move your tokens. Most dapps ask for
`MaxUint256` — an unlimited allowance — because it saves the user a second signature
later.

That allowance does not expire. It stays live after you stop using the dapp, and it is
still live if the contract is later compromised. Drained-wallet incidents are routinely
not a stolen private key but a forgotten approval from months earlier.

This tool shows you what you have left open, and closes it.

---

## What it does

- Scans a wallet's recent `Approval` events and resolves each one's **live** allowance,
  rather than trusting the amount in the original event.
- Flags unlimited approvals and highlights those rows.
- Formats amounts using each token's own `decimals`, falling back to the raw integer
  when a token does not expose one.
- Revokes an approval by sending `approve(spender, 0)` from the connected wallet, then
  re-reads the allowance on-chain to confirm it is actually zero before reporting
  success.
- Links each revoke transaction to Sepolia Etherscan.

---

## How it works

The parts that were not obvious while building it:

**Log scanning is chunked.** `eth_getLogs` is filtered on
`topics[0] = keccak("Approval(address,address,uint256)")` and
`topics[1] = the owner address, left-padded to 32 bytes`. Providers cap how wide a
block range you may request, so the backend walks a 300-block lookback in 10-block
chunks instead of asking for the whole range at once. 300 blocks at ~12s is roughly one
hour of history — a deliberate limit, see below.

**ERC-721 shares the event signature.** `Approval(address,address,uint256)` is identical
for ERC-20 and ERC-721, so an NFT approval produces a log with the same `topics[0]`.
They are told apart by shape: the ERC-721 version indexes the token ID, giving **four**
topics, while ERC-20 has three. Logs with four topics are dropped in
`backend/pairs.js`.

**Owner/spender pairs are deduplicated before any contract call.** A wallet that
approved the same spender five times produces five logs but needs one `allowance()`
read. Pairs go into a `Set`, and the resulting `ethers.Contract` instances are cached in
a `Map` keyed by token address, so each token is instantiated once no matter how many
spenders it has.

**"Unlimited" is checked against two sentinels.** The obvious one is `MaxUint256`.
Some tokens — Uniswap's permit-style approvals among them — store a uint96-max
allowance instead, so `(1n << 96n) - 1n` is treated as unlimited too.

**Non-standard tokens do not kill the scan.** `symbol()` and `decimals()` are optional
in practice; plenty of deployed tokens omit them or return malformed data. Both calls
are wrapped so that a `CALL_EXCEPTION` or `BAD_DATA` returns `null` for that field and
the scan continues, instead of rejecting the whole `Promise.all` and losing every other
approval.

**The RPC key never reaches the browser.** The React app talks only to the Express
backend; the backend holds the Alchemy URL. This was not the original design — during
testing the key appeared in a raw 500 response, because ethers v6 puts the full request
URL into `error.message` on a `SERVER_ERROR`. The key was rotated and error responses
now return fixed strings with the real error logged server-side only.

**Rate limits answer properly.** A 429 from the provider is returned to the client as a
429 with a `Retry-After` header and a readable message, not as a generic 500.

**Revoking verifies rather than assumes.** After `approve(spender, 0)` is mined, the
app polls for the receipt, checks `receipt.status === 1`, then performs a fresh
`allowance()` read. The row is only marked revoked if that read returns `0`. A
transaction can succeed and still not do what you expected; the read is the proof. An
in-flight `Set` keyed by owner+token+spender prevents the same revoke being fired twice
by double-clicking.

---

## Stack

| | |
|---|---|
| Frontend | React 19, Vite |
| Backend | Node.js, Express 5 |
| Chain | ethers.js v6, Alchemy JSON-RPC, Ethereum Sepolia |
| Contract reads | `eth_getLogs`, `allowance()`, `decimals()`, `symbol()` |
| Writes | `approve(spender, 0)` via injected browser wallet |

---

## Running it locally

**You need:** Node 18+, an Alchemy (or other) Sepolia RPC URL, and a browser wallet
such as MetaMask set to Sepolia.

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PORT=3000
```

`.env` is gitignored. Do not commit it.

```bash
npm start      # or: npm run dev  (requires nodemon)
```

The backend listens on `http://localhost:3000`.

### Frontend

```bash
cd build1
npm install
npm run dev
```

Vite serves on `http://localhost:5173`, which is the only origin the backend's CORS
config allows.

### Using it

1. Paste a Sepolia address and press **Scan wallet**. The bulb above the button lights
   up once the address is valid.
2. Approvals from the last ~hour appear in the table. Unlimited ones are highlighted.
3. To revoke, click **connect wallet** first. The same wallet that was scanned must be
   connected, and it must be on Sepolia — the app refuses otherwise rather than sending
   a transaction that would fail.
4. Press **Revoke** on a row and confirm in your wallet.

### API

| Route | Returns |
|---|---|
| `GET /approvals/:address` | `{ success, data: [...] }` — live scan |
| `GET /approvals` | static mock data, for working on the UI without burning RPC calls |

---

## Known limits

These are real constraints, not bugs:

- **Sepolia only.** The chain ID check is hardcoded to `11155111`.
- **~1 hour of history.** The 300-block lookback keeps the scan inside free-tier RPC
  limits. A wallet's older approvals are not found. Covering full history needs either
  an archive-node indexer or a paid log API, which is the main thing standing between
  this and a tool anyone could use on mainnet.
- **No pagination or caching.** Every scan re-queries from scratch.
- **Scan is read-only against the address you type.** You do not need to connect a
  wallet to scan — only to revoke.

---

## Roadmap

- [ ] Transaction simulation before signing, so the user sees the effect of a revoke
      before approving it
- [ ] Mainnet support with an indexed log source, removing the 1-hour window
- [ ] Batch revoke in a single confirmation
- [ ] Risk scoring for spender addresses

---

## Why it exists

I am a self-taught JavaScript developer, and this is the project I use to learn how
on-chain data behaves in practice rather than in a tutorial: real event logs, real
non-conforming tokens, real provider rate limits, real signing. Most of the detail in
the *How it works* section above is there because the first version broke on it.

[github.com/maleficboss](https://github.com/maleficboss)
