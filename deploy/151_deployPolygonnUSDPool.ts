import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  let nerveUSDPool = await getOrNull("PolygonNervenUSDMetaPool")
  if (nerveUSDPool) {
    log(`reusing "PolygonNervenUSDMetaPool" at ${nerveUSDPool.address}`)
  } else if ((await getChainId()) != CHAIN_ID.POLYGON) {
    log(`Not Polygon`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("nUSD")).address,
      (await get("NervePolygonUSDPoolLPToken")).address,
    ]
    const TOKEN_DECIMALS = [18, 18]
    const LP_TOKEN_NAME = "nUSD LP"
    const LP_TOKEN_SYMBOL = "nUSD-LP"
    const INITIAL_A = 2000
    const SWAP_FEE = 4e6 // 4bps
    const ADMIN_FEE = 0
    const WITHDRAW_FEE = 0

    const receipt = await execute(
      "MetaSwapDeployer",
      { from: deployer, log: true },
      "deploy",
      TOKEN_ADDRESSES,
      TOKEN_DECIMALS,
      LP_TOKEN_NAME,
      LP_TOKEN_SYMBOL,
      INITIAL_A,
      SWAP_FEE,
      ADMIN_FEE,
      (
        await get("LPToken")
      ).address,
      (
        await get("NervePolygonUSDPool")
      ).address,
    )

    const newPoolEvent = receipt?.events?.find(
      (e: any) => e["event"] == "NewMetaSwapPool",
    )
    const usdSwapAddress = newPoolEvent["args"]["metaSwapAddress"]
    const usdSwapDepositAddress = newPoolEvent["args"]["metaSwapDepositAddress"]
    log(
      `deployed USD pool clone (targeting "NervePolygonUSDPool") at ${usdSwapAddress}`,
    )
    await save("PolygonNerveNUSDMetaPoolDeposit", {
      abi: (await get("MetaSwapDeposit")).abi,
      address: usdSwapDepositAddress,
    })
    log(
      `deployed USD metapool deposit clone (targeting "NervePolygonUSDPool") at ${usdSwapDepositAddress}`,
    )
    await save("PolygonNerveNUSDMetaPool", {
      abi: (await get("MetaSwap")).abi,
      address: usdSwapAddress,
    })

    const lpTokenAddress = (
      await read("PolygonNerveNUSDMetaPool", "swapStorage")
    ).lpToken
    log(`USD pool LP Token at ${lpTokenAddress}`)

    await save("PolygonNerveNUSDMetaPoolLPToken", {
      abi: (await get("USDC")).abi, // Generic ERC20 ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["PolygonNerveNUSDMetaPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "USDPoolTokens",
]
