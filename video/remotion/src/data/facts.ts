// Real, on-chain values shown in the film. Sourced from data/hub-settlement-counterparty.json
// and the deployed contract constants. Nothing here is invented; every hash resolves on a
// public explorer. Kept in one place so a scene never hardcodes a stale value.

export const HUB = '0x676a74fa6542BEd2dD4A16EF122f75968329B1B0';

export const SETTLEMENT = {
  operator: '0x58a228266B1aa5901e94799974683d11115BdaF6',
  seller: '0xa597e3B8722f71e4f4FDe472d974A7e1cfE74F24',
  treasury: '0x1Af601B44F42C02DB40F1532D5b6a13992Ed4155',
  amount: '0.001',
  payout: '0.0009975',
  fee: '0.0000025',
  sourceTx: '0x94d9d06bbe1c6478a76ec4112a6b2edd17fb7ca1ec7b14f46db981d66e67399c',
  settleTx: '0x58e18e7c41659bb4a2b6d000ee7f8fa18fa37a3ff37bf89819b68a43cfc9d597',
  sourceBlock: 11649456,
  settleBlock: 5442390,
};

// SettlementHub fee schedule (deployed constants, basis points).
export const FEE = {
  bps: 25,
  maxBps: 100,
  verifiedDiscountBps: 15,
  verifiedNetBps: 10,
};

// The twelve-entry catalogue, the nine columns of the scorecard.
export const CATALOGUE = [
  'B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06',
  'B-07', 'B-08', 'B-09', 'B-10', 'B-11', 'B-12',
];

export const CHECKS = ['status', 'emitter', 'event', 'replay', 'chain', 'order', 'fields', 'window', 'log'];

export const REPO = 'github.com/kasbsquall/thirdcheck';

export const short = (h: string): string => `${h.slice(0, 10)}…${h.slice(-6)}`;
