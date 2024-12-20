import { MathLib, type RoundingDirection } from "../math/index.js";
import type { Address, BigIntish } from "../types.js";

import type { IToken } from "./Token.js";
import { WrappedToken } from "./WrappedToken.js";

export class ConstantWrappedToken extends WrappedToken {
  public readonly underlyingDecimals;

  constructor(
    token: IToken,
    underlying: Address,
    underlyingDecimals: BigIntish = 0,
  ) {
    super(token, underlying);

    this.underlyingDecimals = BigInt(underlyingDecimals);
  }

  public override toWrappedExactAmountIn(
    unwrappedAmount: bigint,
    _slippage?: bigint,
    rounding: RoundingDirection = "Down",
  ) {
    return super.toWrappedExactAmountIn(unwrappedAmount, 0n, rounding);
  }

  /** The amount of unwrappedTokens that should be wrapped to receive `wrappedAmount` */
  public toWrappedExactAmountOut(
    wrappedAmount: bigint,
    _slippage?: bigint,
    rounding: RoundingDirection = "Up",
  ) {
    return super.toWrappedExactAmountOut(wrappedAmount, 0n, rounding);
  }

  /** The expected amount when unwrapping `wrappedAmount` */
  public toUnwrappedExactAmountIn(
    wrappedAmount: bigint,
    _slippage?: bigint,
    rounding: RoundingDirection = "Down",
  ) {
    return super.toUnwrappedExactAmountIn(wrappedAmount, 0n, rounding);
  }

  /** The amount of wrappedTokens that should be unwrapped to receive `unwrappedAmount` */
  public toUnwrappedExactAmountOut(
    unwrappedAmount: bigint,
    _slippage?: bigint,
    rounding: RoundingDirection = "Up",
  ) {
    return super.toUnwrappedExactAmountOut(unwrappedAmount, 0n, rounding);
  }

  protected _wrap(amount: bigint) {
    return MathLib.mulDivDown(
      amount,
      10n ** BigInt(this.decimals),
      10n ** this.underlyingDecimals,
    );
  }

  protected _unwrap(amount: bigint) {
    return MathLib.mulDivDown(
      amount,
      10n ** this.underlyingDecimals,
      10n ** BigInt(this.decimals),
    );
  }
}
