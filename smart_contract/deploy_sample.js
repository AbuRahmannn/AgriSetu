// Sample ethers.js deploy script (use Hardhat or Truffle to run)
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with', deployer.address);
  const Trace = await ethers.getContractFactory('Traceability');
  const t = await Trace.deploy();
  await t.deployed();
  console.log('Traceability deployed at', t.address);
}
main().catch(e=>{ console.error(e); process.exit(1); });
