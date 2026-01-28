import { useState } from 'react';
import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core';
import {
  InjectedConnector,
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected,
} from '@web3-react/injected-connector';
import {
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect,
  WalletConnectConnector,
} from '@web3-react/walletconnect-connector';
import { ethers } from 'ethers';
import Web3 from 'web3';

//0 ropsten, 1 bsc
let netid = 0;
let provider = null;
let walletconnect, injected, bsc;

const ensureConnectorOff = (connector) => {
  if (!connector) return connector;
  if (typeof connector.off === 'function') return connector;
  if (typeof connector.removeListener === 'function') {
    // web3-react core expects connectors to support `.off(...)` (EventEmitter in Node does),
    // but some browser EventEmitter polyfills only implement `removeListener`.
    connector.off = function (event, listener) {
      this.removeListener(event, listener);
      return this;
    };
  }
  return connector;
};

//mainnet
// const netlist = [
//   {
//     chaind : 1,
//     rpcurl : "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
//     blockurl : "https://etherscan.io",
//     chainname : "Ethereum Mainnet",
//     chainnetname : "Ethereum Mainnet",
//     chainsymbol : "ETH",
//     chaindecimals : 18
//   },
//   {
//     chaind : 56,
//     rpcurl : "https://bsc-dataseed1.ninicoin.io",
//     blockurl : "https://bscscan.com/",
//     chainname : "Binance Smart Chain Mainnet",
//     chainnetname : "Binance Smart Chain Mainnet",
//     chainsymbol : "BNB",
//     chaindecimals : 18
//   },
// ]

//testnet
const netlist = [
  {
    chaind: 3,
    rpcurl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    blockurl: 'https://ropsten.etherscan.io',
    chainname: 'Ethereum Mainnet',
    chainnetname: 'Ethereum Mainnet',
    chainsymbol: 'ETH',
    chaindecimals: 18,
  },
  {
    chaind: 97,
    rpcurl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    blockurl: 'https://testnet.bscscan.com/',
    chainname: 'BSC testnet',
    chainnetname: 'BSC testnet',
    chainsymbol: 'BNB',
    chaindecimals: 18,
  },
];

const defaultethereumconflag = {
  testing: false,
  autoGasMultiplier: 1.5,
  defaultConfirmations: 1,
  defaultGas: '6000000',
  defaultGasPrice: '1000000000000',
  nodetimeout: 10000,
};

function web3ProviderFrom(endpoint, config) {
  const ethConfig = Object.assign(defaultethereumconflag, config || {});

  const providerClass = endpoint.includes('wss')
    ? Web3.providers.WebsocketProvider
    : Web3.providers.HttpProvider;

  return new providerClass(endpoint, {
    timeout: ethConfig.nodetimeout,
  });
}

export function getDefaultProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(netlist[netid].rpcurl, netlist[netid].chaind);
  }

  return provider;
}

export function setNet(id) {
  netid = id;

  walletconnect = ensureConnectorOff(
    new WalletConnectConnector({
      rpc: { [netlist[netid].chaind]: netlist[netid].rpcurl },
      qrcode: true,
      pollingInterval: 12000,
    })
  );

  injected = ensureConnectorOff(
    new InjectedConnector({
      supportedChainIds: [netlist[netid].chaind],
    })
  );

  // legacy / unused, but keep consistent if ever configured
  bsc = ensureConnectorOff(bsc);
}

export function useWalletConnector() {
  const { activate, deactivate } = useWeb3React();
  const [provider, setProvider] = useState({});

  const setupNetwork = async () => {
    const provider = window.ethereum;
    if (provider) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [
            {
              chainId: `0x${netlist[netid].chaind.toString(16)}`,
            },
          ],
        });
        setProvider(provider);
        return true;
      } catch (error) {
        const errorCode =
          error?.code ?? error?.data?.originalError?.code ?? error?.data?.code ?? error?.error?.code;

        // Unrecognized chain ID, try adding it first.
        // MetaMask uses 4902 for "unknown chain".
        if (errorCode === 4902) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${netlist[netid].chaind.toString(16)}`,
                  chainName: netlist[netid].chainname,
                  rpcUrls: [netlist[netid].rpcurl],
                  nativeCurrency: {
                    name: netlist[netid].chainsymbol,
                    symbol: netlist[netid].chainsymbol,
                    decimals: netlist[netid].chaindecimals,
                  },
                  blockExplorerUrls: [netlist[netid].blockurl],
                },
              ],
            });

            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [
                {
                  chainId: `0x${netlist[netid].chaind.toString(16)}`,
                },
              ],
            });

            setProvider(provider);
            return true;
          } catch (addError) {
            return false;
          }
        }
        return false;
      }
    } else {
      console.error(
        "Can't setup the Default Network network on metamask because window.ethereum is undefined"
      );
      return false;
    }
  };

  const loginWallet = async (connector) => {
    if (!connector) {
      throw new Error('Unable to find connector! The connector config is wrong');
    }

    // Ensure compatibility with web3-react core's expectation of `.off(...)`.
    const safeConnector = ensureConnectorOff(connector);

    try {
      await activate(safeConnector, undefined, true);
      setProvider(safeConnector);
      return true;
    } catch (error) {
      if (error instanceof UnsupportedChainIdError) {
        const hasSetup = await setupNetwork();
        if (hasSetup) {
          await activate(safeConnector, undefined, true);
          setProvider(safeConnector);
          return true;
        }
        throw error;
      }

      if (error instanceof NoEthereumProviderError) {
        throw new Error('No injected wallet found. Please install MetaMask.');
      }
      if (
        error instanceof UserRejectedRequestErrorInjected ||
        error instanceof UserRejectedRequestErrorWalletConnect
      ) {
        throw new Error('Connection request rejected.');
      }

      throw error;
    }
  };

  const loginMetamask = async () => {
    return loginWallet(injected);
  };

  const loginWalletConnect = async () => {
    return loginWallet(walletconnect);
  };

  const loginBSC = async () => {
    return loginWallet(bsc);
  };

  const logoutWalletConnector = () => {
    // v6 signature: `deactivate()` (no args). Passing args can mask real issues.
    try {
      deactivate();
    } catch (error) {
      console.log(error);
      return false;
    }
    return true;
  };

  return {
    loginMetamask,
    loginWalletConnect,
    loginBSC,
    logoutWalletConnector,
  };
}

// ---- legacy below (kept for reference) ----

/*
export function setNet(id) {
  netid = id;

  walletconnect = new WalletConnectConnector({
    rpc: { [netlist[netid].chaind]: netlist[netid].rpcurl },
    qrcode: true,
    pollingInterval: 12000,
  });

  injected = new InjectedConnector({
    supportedChainIds: [netlist[netid].chaind],
  });
}
*/
