import { MathLib } from "@morpho-org/blue-sdk";

import { MetaMorphoErrors } from "../../errors.js";
import type { MetaMorphoOperations } from "../../operations.js";
import { handleBlueOperation } from "../blue/index.js";
import type { OperationHandler } from "../types.js";

export const handleMetaMorphoReallocateOperation: OperationHandler<
  MetaMorphoOperations["MetaMorpho_Reallocate"]
> = ({ args: allocations, sender, address }, data) => {
  const { owner, publicAllocatorConfig } = data.getVault(address);
  if (sender !== owner && (!publicAllocatorConfig || sender !== address))
    throw new MetaMorphoErrors.NotAllocatorRole(address, sender);

  let totalSupplied = 0n;
  let totalWithdrawn = 0n;

  for (const { id, assets } of allocations) {
    handleBlueOperation(
      {
        type: "Blue_AccrueInterest",
        sender: address,
        args: { id },
      },
      data,
    );

    const { cap, enabled } = data.getVaultMarketConfig(address, id);
    const { supplyAssets, supplyShares } = data.getAccrualPosition(address, id);

    const withdrawn = MathLib.zeroFloorSub(supplyAssets, assets);

    if (withdrawn > 0n) {
      if (!enabled) throw new MetaMorphoErrors.MarketNotEnabled(address, id);

      handleBlueOperation(
        {
          type: "Blue_Withdraw",
          sender: address,
          args: {
            id,
            ...(assets === 0n
              ? { shares: supplyShares }
              : { assets: withdrawn }),
            onBehalf: address,
            receiver: address,
          },
        },
        data,
      );

      totalWithdrawn += withdrawn;
    } else {
      const suppliedAssets =
        assets === MathLib.MAX_UINT_256
          ? MathLib.zeroFloorSub(totalWithdrawn, totalSupplied)
          : assets - supplyAssets;

      if (suppliedAssets === 0n) continue;

      if (cap === 0n)
        throw new MetaMorphoErrors.UnauthorizedMarket(address, id);

      if (supplyAssets + suppliedAssets > cap)
        throw new MetaMorphoErrors.SupplyCapExceeded(address, id, cap);

      handleBlueOperation(
        {
          type: "Blue_Supply",
          sender: address,
          args: {
            id,
            assets: suppliedAssets,
            onBehalf: address,
          },
        },
        data,
      );

      totalSupplied += suppliedAssets;
    }
  }

  if (totalWithdrawn !== totalSupplied)
    throw new MetaMorphoErrors.InconsistentReallocation(
      address,
      totalSupplied,
      totalWithdrawn,
    );

  // Update totalAssets as soon as the vault is interacted with (onchain, it's a dynamic view function).
  // But do not accrue vault fee!
  const accruedVault = data.tryGetAccrualVault(address);
  if (accruedVault != null)
    data.getVault(address).totalAssets = accruedVault.totalAssets;
};
