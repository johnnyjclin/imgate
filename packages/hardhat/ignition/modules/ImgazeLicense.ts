import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Base Sepolia USDC contract address
const USDC_ADDRESS = "0x5dEaC602762362FE5f135FA5904351916053cF70";

const ImgateLicenseModule = buildModule("ImgateLicenseModule", (m) => {
  // Get platform fee recipient from parameters or use deployer
  const platformFeeRecipient = m.getParameter(
    "platformFeeRecipient",
    "0x0000000000000000000000000000000000000000" // Will be replaced with deployer
  );

  const usdc = m.getParameter("usdc", USDC_ADDRESS);

  const imgateLicense = m.contract("ImgateLicense", [
    usdc,
    platformFeeRecipient,
  ]);

  return { imgateLicense };
});

export default ImgateLicenseModule;
