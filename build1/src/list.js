// Phase 1: Mock approvals
// Fake approval rows in the old shape (no decimals, symbol or isUnlimited fields).
// The backend's /approvals route sends this list back as-is.
// The huge amounts are MaxUint256, the value used for an "unlimited" approval.
// WETH has amount "0": the real scan route (/approvals/:address) drops zero allowances,
// so a row like this would never come back from a real scan.
const mock = [
  {
    id: 1,
    token: "USDC",
    spender: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    revoked: false
  },
  {
    id: 2,
    token: "USDT",
    spender: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    amount: "500000000",
    revoked: false
  },
  {
    id: 3,
    token: "WBTC",
    spender: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    revoked: false
  },
  {
    id: 4,
    token: "LINK",
    spender: "0xe592427a0aece92de3edee1f18e0157c05861564",
    amount: "250000000000000000000",
    revoked: false
  },
  {
    id: 5,
    token: "DAI",
    spender: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    amount: "1000000000000000000000",
    revoked: false
  },
  {
    id: 6,
    token: "UNI",
    spender: "0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b",
    amount: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    revoked: false
  },
  {
    id: 7,
    token: "WETH",
    spender: "0x3fc91a3afd903de279a383666bc001a17dee3d15",
    amount: "0",
    revoked: false
  }
];

// Phase 2: Export
// Makes the list importable as `mock`.
export default mock;