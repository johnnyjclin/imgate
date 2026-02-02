import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Base Sepolia USDC contract address
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const ImgateLicenseModule = buildModule("ImgateLicenseModule", (m) => {
  // Get deployer account to use as default platform fee recipient
  const deployer = m.getAccount(0);
  
  // Get platform fee recipient from parameters or use deployer address
  const platformFeeRecipient = m.getParameter(
    "platformFeeRecipient",
    deployer
  );

  const usdc = m.getParameter("usdc", USDC_ADDRESS);

  const imgateLicense = m.contract("ImgateLicense", [
    usdc,
    platformFeeRecipient,
  ]);

  return { imgateLicense };
});

export default ImgateLicenseModule;
