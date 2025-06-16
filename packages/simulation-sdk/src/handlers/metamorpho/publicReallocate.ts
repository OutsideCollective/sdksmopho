import { type MarketId, MathLib, NATIVE_ADDRESS } from "@morpho-org/blue-sdk";

import {
  MetaMorphoErrors,
  PublicAllocatorErrors,
  UnknownVaultMarketPublicAllocatorConfigError,
  UnknownVaultPublicAllocatorConfigError,
} from "../../errors.js";
import type { MetaMorphoOperations } from "../../operations.js";
import { handleBlueOperation } from "../blue/index.js";
import { handleErc20Operation } from "../erc20/index.js";
import type { OperationHandler } from "../types.js";

import { ZERO_ADDRESS } from "@morpho-org/morpho-ts";
import { handleMetaMorphoReallocateOperation } from "./reallocate.js";

export const handleMetaMorphoPublicReallocateOperation: OperationHandler<
  MetaMorphoOperations["MetaMorpho_PublicReallocate"]
> = ({ args: { withdrawals, supplyMarketId }, sender, address }, data) => {
  const { publicAllocatorConfig } = data.getVault(address);
  if (publicAllocatorConfig == null)
    throw new UnknownVaultPublicAllocatorConfigError(address);

  const { fee } = publicAllocatorConfig;

  if (fee > 0n) {
    handleErc20Operation(
      {
        type: "Erc20_Transfer",
        sender: address,
        address: NATIVE_ADDRESS,
        args: {
          amount: fee,
          from: sender,
          to: ZERO_ADDRESS,
        },
      },
      data,
    );

    publicAllocatorConfig.accruedFee += fee;
  }

  if (withdrawals.length === 0)
    throw new PublicAllocatorErrors.EmptyWithdrawals(address);

  const vaultSupplyMarketConfig = data.getVaultMarketConfig(
    address,
    supplyMarketId,
  );
  if (!vaultSupplyMarketConfig.enabled)
    throw new MetaMorphoErrors.MarketNotEnabled(address, supplyMarketId);

  if (vaultSupplyMarketConfig.publicAllocatorConfig == null)
    throw new UnknownVaultMarketPublicAllocatorConfigError(
      address,
      supplyMarketId,
    );

  let totalWithdrawn = 0n;
  let prevId: MarketId | undefined = undefined;

  const allocations: { id: MarketId; assets: bigint }[] = [];
  for (const { id, assets } of withdrawals) {
    if (prevId != null && id <= prevId)
      throw new PublicAllocatorErrors.InconsistentWithdrawals(
        address,
        prevId,
        id,
      );

    prevId = id;

    const vaultMarketConfig = data.getVaultMarketConfig(address, id);
    if (!vaultMarketConfig.enabled)
      throw new MetaMorphoErrors.MarketNotEnabled(address, id);

    if (vaultMarketConfig.publicAllocatorConfig == null)
      throw new UnknownVaultMarketPublicAllocatorConfigError(address, id);

    if (vaultMarketConfig.publicAllocatorConfig.maxOut < assets)
      throw new PublicAllocatorErrors.MaxOutflowExceeded(address, id);

    if (assets === 0n)
      throw new PublicAllocatorErrors.WithdrawZero(address, id);

    if (id === supplyMarketId)
      throw new PublicAllocatorErrors.DepositMarketInWithdrawals(address, id);

    handleBlueOperation(
      {
        type: "Blue_AccrueInterest",
        sender: address,
        args: { id },
      },
      data,
    );

    const { supplyAssets } = data.getAccrualPosition(address, id, false);

    if (supplyAssets < assets)
      throw new PublicAllocatorErrors.NotEnoughSupply(address, id);

    vaultMarketConfig.publicAllocatorConfig.maxIn += assets;
    vaultMarketConfig.publicAllocatorConfig.maxOut -= assets;
    allocations.push({ id, assets: supplyAssets - assets });

    totalWithdrawn += assets;
  }

  if (vaultSupplyMarketConfig.publicAllocatorConfig.maxIn < totalWithdrawn)
    throw new PublicAllocatorErrors.MaxInflowExceeded(address, supplyMarketId);

  vaultSupplyMarketConfig.publicAllocatorConfig.maxIn -= totalWithdrawn;
  vaultSupplyMarketConfig.publicAllocatorConfig.maxOut += totalWithdrawn;
  allocations.push({ id: supplyMarketId, assets: MathLib.MAX_UINT_256 });

  handleMetaMorphoReallocateOperation(
    {
      type: "MetaMorpho_Reallocate",
      sender: address,
      address,
      args: allocations,
    },
    data,
  );
};
