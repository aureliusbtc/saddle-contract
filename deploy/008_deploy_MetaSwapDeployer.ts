import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../utils/network"
import { MULTISIG_ADDRESS } from "../utils/accounts"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { get, deploy, execute, read } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy("MetaSwapDeployer", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      (await get("MetaSwap")).address,
      (await get("MetaSwapDeposit")).address,
    ],
  })

  const currentOwner = await read("MetaSwapDeployer", "owner")

  if (
    (await getChainId()) == CHAIN_ID.MAINNET &&
    currentOwner != MULTISIG_ADDRESS
  ) {
    await execute(
      "MetaSwapDeployer",
      { from: deployer, log: true },
      "transferOwnership",
      MULTISIG_ADDRESS,
    )
  }
}
export default func
func.tags = ["MetaSwapDeployer"]
