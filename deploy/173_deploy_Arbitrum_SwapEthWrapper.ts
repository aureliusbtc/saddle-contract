import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()

  if ((await getChainId()) === '42161') {
    await deploy("SwapEthWrapper", {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        args: [
          (await get('WETH')).address,
          (await get('ETHPool')).address,
          '0x0AF91FA049A7e1894F480bFE5bBa20142C6c29a9'
        ]
    })
    }
}
export default func
func.tags = ["SwapEthWrapper"]
