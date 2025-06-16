import _ from "lodash";
import { parseUnits } from "viem";

import { describe, expect, test } from "vitest";
import { simulateOperation } from "../../../src/index.js";
import { dataFixture, marketA1, tokenA, userA, userB } from "../../fixtures.js";

const type = "Blue_Borrow";

const marketData = dataFixture.getMarket(marketA1.id, false);

describe(type, () => {
  const assets = parseUnits("10", 6);
  const shares = parseUnits("10", 6 + 6);

  test("should borrow assets", () => {
    const result = simulateOperation(
      {
        type,
        sender: userB,
        args: {
          id: marketA1.id,
          assets,
          onBehalf: userB,
          receiver: userA,
        },
      },
      dataFixture,
    );

    const expected = _.cloneDeep(dataFixture);
    expected.getMarket(marketA1.id, false).totalBorrowAssets += assets;
    expected.getMarket(marketA1.id, false).totalBorrowShares += shares;
    expected.getPosition(userB, marketA1.id).borrowShares += shares;
    expected.getHolding(userA, tokenA).balance += assets;

    expect(result).toEqual(expected);
  });

  test("should borrow shares", () => {
    const result = simulateOperation(
      {
        type,
        sender: userB,
        args: {
          id: marketA1.id,
          shares,
          onBehalf: userB,
          receiver: userA,
        },
      },
      dataFixture,
    );

    const expected = _.cloneDeep(dataFixture);
    expected.getMarket(marketA1.id, false).totalBorrowAssets += assets;
    expected.getMarket(marketA1.id, false).totalBorrowShares += shares;
    expected.getPosition(userB, marketA1.id).borrowShares += shares;
    expected.getHolding(userA, tokenA).balance += assets;

    expect(result).toEqual(expected);
  });

  test("should throw if assets is negative", () => {
    expect(() =>
      simulateOperation(
        {
          type,
          sender: userB,
          args: {
            id: marketA1.id,
            assets: -1n,
            onBehalf: userB,
            receiver: userA,
          },
        },
        dataFixture,
      ),
    ).toThrowErrorMatchingInlineSnapshot(`
      [Error: invalid input: assets=-1

      when simulating operation:
      {
        "type": "Blue_Borrow",
        "sender": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        "args": {
          "id": "0x042487b563685b432d4d2341934985eca3993647799cb5468fb366fad26b4fdd",
          "assets": "-1n",
          "onBehalf": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          "receiver": "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"
        }
      }]
    `);
  });

  test("should throw if shares is negative", () => {
    expect(() =>
      simulateOperation(
        {
          type,
          sender: userB,
          args: {
            id: marketA1.id,
            shares: -1n,
            onBehalf: userB,
            receiver: userA,
          },
        },
        dataFixture,
      ),
    ).toThrowErrorMatchingInlineSnapshot(`
      [Error: invalid input: shares=-1

      when simulating operation:
      {
        "type": "Blue_Borrow",
        "sender": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        "args": {
          "id": "0x042487b563685b432d4d2341934985eca3993647799cb5468fb366fad26b4fdd",
          "shares": "-1n",
          "onBehalf": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          "receiver": "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"
        }
      }]
    `);
  });

  test("should throw if insufficient liquidity", () => {
    expect(() =>
      simulateOperation(
        {
          type,
          sender: userB,
          args: {
            id: marketA1.id,
            assets: marketData.totalSupplyAssets,
            onBehalf: userB,
            receiver: userA,
          },
        },
        dataFixture,
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `
      [Error: insufficient liquidity on market 0x042487b563685b432d4d2341934985eca3993647799cb5468fb366fad26b4fdd

      when simulating operation:
      {
        "type": "Blue_Borrow",
        "sender": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        "args": {
          "id": "0x042487b563685b432d4d2341934985eca3993647799cb5468fb366fad26b4fdd",
          "assets": "10750000000n",
          "onBehalf": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          "receiver": "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"
        }
      }]
    `,
    );
  });

  test("should throw if insufficient position", () => {
    expect(() =>
      simulateOperation(
        {
          type,
          sender: userA,
          args: {
            id: marketA1.id,
            assets,
            onBehalf: userA,
            receiver: userA,
          },
        },
        dataFixture,
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `
      [Error: insufficient collateral for user 0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa on market 0x042487b563685b432d4d2341934985eca3993647799cb5468fb366fad26b4fdd

      when simulating operation:
      {
        "type": "Blue_Borrow",
        "sender": "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
        "args": {
          "id": "0x042487b563685b432d4d2341934985eca3993647799cb5468fb366fad26b4fdd",
          "assets": "10000000n",
          "onBehalf": "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
          "receiver": "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa"
        }
      }]
    `,
    );
  });
});
