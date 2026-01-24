const { createPublicClient, http } = require('viem');
const { baseSepolia } = require('viem/chains');

const client = createPublicClient({ 
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

const contractAddress = '0xef8478A31408958EC342d2d0eF095A884aBe9440';

async function check() {
  console.log(`Checking code at ${contractAddress}...`);
  const code = await client.getBytecode({ address: contractAddress });
  if (code) {
    console.log('Code found! Length:', code.length);
    console.log('Contract exists.');

    // Try to read owner
    try {
        const val = await client.readContract({
            address: contractAddress,
            abi: [{
                name: 'owner',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ type: 'address' }]
            }],
            functionName: 'owner'
        });
        console.log('owner() returned:', val);
    } catch (e) {
        console.error('Failed to read owner():', e.message);
    }

  } else {
    console.log('No code found at this address.');
    console.log('The contract might not be deployed or the address is wrong.');
  }
}

check();
