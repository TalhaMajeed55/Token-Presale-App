import { AbstractConnector } from '@web3-react/abstract-connector';

const coerceChainId = (chainId) => {
  if (typeof chainId === 'number') return chainId;
  if (typeof chainId === 'string') {
    const trimmed = chainId.trim();
    if (trimmed.startsWith('0x')) return parseInt(trimmed, 16);
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export class WalletConnectV2Connector extends AbstractConnector {
  constructor(config) {
    super({ supportedChainIds: config?.chains });
    this.config = config;
    this.walletConnectProvider = undefined;

    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
  }

  async activate() {
    const projectId = this.config?.projectId;
    if (!projectId) {
      throw new Error(
        'Missing WalletConnect Project ID. Set `VITE_WALLETCONNECT_PROJECT_ID` in your .env.'
      );
    }

    if (!this.walletConnectProvider) {
      const wcModule = await import('@walletconnect/ethereum-provider');
      const EthereumProvider =
        wcModule?.EthereumProvider ?? wcModule?.default?.EthereumProvider ?? wcModule?.default ?? wcModule;

      const metadata =
        this.config?.metadata ??
        (typeof window !== 'undefined'
          ? {
              name: 'Token Presale App',
              description: 'Token presale dApp',
              url: window.location.origin,
              icons: [],
            }
          : undefined);

      this.walletConnectProvider = await EthereumProvider.init({
        projectId,
        chains: this.config?.chains,
        optionalChains: this.config?.optionalChains,
        rpcMap: this.config?.rpcMap,
        showQrModal: this.config?.showQrModal ?? true,
        metadata,
      });

      this.walletConnectProvider.on('disconnect', this.handleDisconnect);
      this.walletConnectProvider.on('chainChanged', this.handleChainChanged);
      this.walletConnectProvider.on('accountsChanged', this.handleAccountsChanged);
    }

    await this.walletConnectProvider.connect();

    const account = this.walletConnectProvider.accounts?.[0];
    const chainId = coerceChainId(this.walletConnectProvider.chainId);

    return { provider: this.walletConnectProvider, account, chainId };
  }

  async getProvider() {
    return this.walletConnectProvider;
  }

  async getChainId() {
    return coerceChainId(this.walletConnectProvider?.chainId);
  }

  async getAccount() {
    return this.walletConnectProvider?.accounts?.[0];
  }

  deactivate() {
    if (!this.walletConnectProvider) return;
    try {
      this.walletConnectProvider.removeListener?.('disconnect', this.handleDisconnect);
      this.walletConnectProvider.removeListener?.('chainChanged', this.handleChainChanged);
      this.walletConnectProvider.removeListener?.('accountsChanged', this.handleAccountsChanged);
      this.walletConnectProvider.disconnect?.();
    } finally {
      this.walletConnectProvider = undefined;
    }
  }

  async close() {
    this.emitDeactivate();
  }

  handleChainChanged(chainId) {
    this.emitUpdate({ chainId: coerceChainId(chainId) });
  }

  handleAccountsChanged(accounts) {
    this.emitUpdate({ account: accounts?.[0] });
  }

  handleDisconnect() {
    this.walletConnectProvider = undefined;
    this.emitDeactivate();
  }
}
