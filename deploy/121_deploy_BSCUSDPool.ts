import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { execute, get, getOrNull, log, read, save } = deployments
  const { deployer } = await getNamedAccounts()

  // Manually check if the pool is already deployed
  let nerveUSDPool = await getOrNull("NerveBSCUSDPool")
  if (nerveUSDPool) {
    log(`reusing "NerveBSCUSDPool" at ${nerveUSDPool.address}`)
  } else if ((await getChainId()) != CHAIN_ID.BSC) {
    log(`Not BSC`)
  } else {
    // Constructor arguments
    const TOKEN_ADDRESSES = [
      (await get("BUSD")).address,
      (await get("USDC")).address,
      (await get("USDT")).address,
    ]
    const TOKEN_DECIMALS = [18, 18, 18]
    const LP_TOKEN_NAME = "USD LP"
    const LP_TOKEN_SYMBOL = "USD-LP"
    const INITIAL_A = 2000
    const SWAP_FEE = 4e6 // 4bps
    const ADMIN_FEE = 0
    const WITHDRAW_FEE = 0

    const receipt = await execute(
      "SwapDeployer",
      { from: deployer, log: true },
      "deploy",
      (
        await get("SwapFlashLoan")
      ).address,
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
    )

    const newPoolEvent = receipt?.events?.find(
      (e: any) => e["event"] == "NewSwapPool",
    )
    const usdSwapAddress = newPoolEvent["args"]["swapAddress"]
    log(
      `deployed USD pool clone (targeting "SwapFlashLoan") at ${usdSwapAddress}`,
    )
    await save("NerveBSCUSDPool", {
      abi: (await get("SwapFlashLoan")).abi,
      address: usdSwapAddress,
    })

    const lpTokenAddress = (await read("NerveBSCUSDPool", "swapStorage"))
      .lpToken
    log(`USD pool LP Token at ${lpTokenAddress}`)

    await save("NerveBSCUSDPoolLPToken", {
      abi: (await get("USDC")).abi, // Generic ERC20 ABI
      address: lpTokenAddress,
    })
  }
}
export default func
func.tags = ["BSCUSDPool"]
func.dependencies = [
  "SwapUtils",
  "SwapDeployer",
  "SwapFlashLoan",
  "USDPoolTokens",
]
