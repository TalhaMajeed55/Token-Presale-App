import React, { useEffect, useRef, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { useWalletConnector, setNet } from "./WalletConnector.jsx";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { BinanceLogo } from "../ui/NetworkLogos.jsx";
import { MetamaskLogo, WalletConnectLogo } from "../ui/WalletLogos.jsx";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import { styled } from "@mui/material/styles";
import DoneIcon from "@mui/icons-material/Done";
import { green } from "@mui/material/colors";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import DownloadIcon from "@mui/icons-material/Download";
import InfoIcon from "@mui/icons-material/Info";
import "./index.css";

const SmallAvatar = styled(Avatar)(({ theme }) => ({
  width: 22,
  height: 22,
  border: `2px solid ${theme.palette.background.paper}`,
}));

const networks = [
  { label: "Binance", value: "bnb", icon: <BinanceLogo width={60} /> },
];

const wallets = [
  { label: "Metamask", value: "injected", icon: <MetamaskLogo width={60} /> },
  {
    label: "Wallet Connect",
    value: "walletconnect",
    icon: <WalletConnectLogo width={60} />,
  },
];

const setWalletProvider = (wallet) => {
  localStorage.setItem("wallet", wallet);
};

const supportedWalletProviders = new Set(["injected_bnb", "walletconnect_bnb"]);

const formatAddress = (address) => {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

const getConnectedWalletLabel = (walletprovider) => {
  if (!walletprovider) return "";
  if (walletprovider.startsWith("injected_")) return "MetaMask";
  if (walletprovider.startsWith("walletconnect_")) return "WalletConnect";
  return "";
};

const getConnectedNetworkLabel = (walletprovider) => {
  if (!walletprovider) return "";
  if (walletprovider.endsWith("_bnb")) return "BNB Chain";
  return "";
};

const NetworkWalletProviders = ({
  walletProvidersDialogOpen,
  handleWalletProvidersDialogToggle,
  resetNonce,
}) => {
  const { library, account, error } = useWeb3React();
  const { loginMetamask, loginWalletConnect } = useWalletConnector();
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [installMenuAnchorEl, setInstallMenuAnchorEl] = useState(null);
  const connectTimeoutRef = useRef(null);
  const closeOnSuccessRef = useRef(false);

  const hasInjectedProvider = () => {
    if (typeof window === "undefined") return false;
    return Boolean(window.ethereum);
  };

  const clearConnectTimeout = () => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  };

  const handleSelectNetwork = (network) => {
    setConnectError("");
    setSelectedNetwork((prev) => {
      const next = prev === network ? null : network;
      if (next !== prev) setSelectedWallet(null);
      return next;
    });
  };

  const handleSelectWallet = (wallet) => {
    setConnectError("");
    setSelectedWallet(wallet);
  };

  useEffect(() => {
    if (!walletProvidersDialogOpen) {
      setSelectedNetwork(null);
      setSelectedWallet(null);
      setConnectError("");
      setIsConnecting(false);
      setInstallMenuAnchorEl(null);
      clearConnectTimeout();
      closeOnSuccessRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletProvidersDialogOpen]);

  useEffect(() => {
    if (!walletProvidersDialogOpen) return;
    setSelectedNetwork(null);
    setSelectedWallet(null);
    setConnectError("");
    setIsConnecting(false);
    setInstallMenuAnchorEl(null);
    clearConnectTimeout();
    closeOnSuccessRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce]);

  useEffect(() => {
    if (account && library) {
      if (walletProvidersDialogOpen && closeOnSuccessRef.current) {
        handleWalletProvidersDialogToggle();
      }
      closeOnSuccessRef.current = false;
      setIsConnecting(false);
      setConnectError("");
      clearConnectTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, library]);

  useEffect(() => {
    if (!error) return;
    setIsConnecting(false);
    clearConnectTimeout();
    localStorage.removeItem("connected");
    setConnectError(error?.message || "Failed to connect wallet.");
  }, [error]);

  const handleInstallMenuClose = () => {
    setInstallMenuAnchorEl(null);
  };

  const handleConnectClick = (event) => {
    if (account && library) return;
    if (!selectedNetwork) return;
    if (!selectedWallet) return;

    setConnectError("");

    if (selectedWallet === "injected" && !hasInjectedProvider()) {
      setInstallMenuAnchorEl(event.currentTarget);
      return;
    }

    const walletprovider = `${selectedWallet}_${selectedNetwork}`;
    void startConnect(walletprovider);
  };

  const connectWallet = async (walletprovider) => {
    switch (walletprovider) {
      case "injected_bnb":
        setWalletProvider("injected_bnb");
        setNet(0);
        return loginMetamask();
      case "walletconnect_bnb":
        setWalletProvider("walletconnect_bnb");
        setNet(0);
        return loginWalletConnect();
      default:
        return null;
    }
  };

  const startConnect = async (walletprovider) => {
    console.log("Starting connection with", walletprovider);
    if (!supportedWalletProviders.has(walletprovider)) {
      localStorage.removeItem("connected");
      localStorage.removeItem("wallet");
      setIsConnecting(false);
      setConnectError("Unsupported wallet/network selection.");
      return;
    }

    closeOnSuccessRef.current = true;
    setIsConnecting(true);
    setConnectError("");
    localStorage.setItem("connected", true);

    clearConnectTimeout();
    connectTimeoutRef.current = setTimeout(() => {
      setIsConnecting(false);
      localStorage.removeItem("connected");
      setConnectError("Connection timed out. Please try again.");
    }, 90000);

    try {
      await connectWallet(walletprovider);
      setIsConnecting(false);
      setConnectError("");
      clearConnectTimeout();
    } catch (err) {
      const message =
        (typeof err === "string" && err) ||
        err?.message ||
        (err?.name
          ? `${err.name}${err?.message ? `: ${err.message}` : ""}`
          : "") ||
        "Failed to connect wallet.";
      setIsConnecting(false);
      clearConnectTimeout();
      localStorage.removeItem("connected");
      setConnectError(message);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("connected")) {
      const walletprovider = localStorage.getItem("wallet");
      const isInjected =
        typeof walletprovider === "string" &&
        walletprovider.startsWith("injected_");

      if (!walletprovider) {
        localStorage.removeItem("connected");
        return;
      }

      if (isInjected && !hasInjectedProvider()) {
        localStorage.removeItem("connected");
        localStorage.removeItem("wallet");
        return;
      }

      void startConnect(walletprovider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog
      open={walletProvidersDialogOpen}
      onClose={(event, reason) => {
        if (isConnecting) return;
        handleWalletProvidersDialogToggle(event, reason);
      }}
      disableEscapeKeyDown={isConnecting}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      BackdropProps={{
        style: {
          backgroundColor: "rgba(111, 126, 140, 0.2)",
          backdropFilter: "blur(2px)",
        },
      }}
      PaperProps={{
        style: { borderRadius: 25, boxShadow: "none" },
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id="alert-dialog-title" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Connect Wallet
            </Typography>
          </Box>
          <Box>
            <IconButton
              onClick={handleWalletProvidersDialogToggle}
              aria-label="close"
              sx={{ bgcolor: "grey.100" }}
              disabled={isConnecting}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {account && library ? (
          <Box mb={3}>
            <Alert severity="success">
              Connected
              {getConnectedWalletLabel(localStorage.getItem("wallet"))
                ? ` to ${getConnectedWalletLabel(localStorage.getItem("wallet"))}`
                : ""}
              {getConnectedNetworkLabel(localStorage.getItem("wallet"))
                ? ` (${getConnectedNetworkLabel(localStorage.getItem("wallet"))})`
                : ""}
              {`: ${formatAddress(account)}`}
            </Alert>
          </Box>
        ) : null}

        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Avatar sx={{ width: 24, height: 24, fontSize: "0.9rem" }}>1</Avatar>
          <Typography sx={{ fontWeight: 500 }}>Choose Network</Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={5}
          alignItems="center"
          mb={4}
          justifyContent="space-evenly"
        >
          {networks.map((network) => (
            <Stack
              component={Button}
              color="inherit"
              spacing={1}
              key={network.value}
              onClick={() => handleSelectNetwork(network.value)}
              disabled={isConnecting}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={
                  selectedNetwork === network.value ? (
                    <SmallAvatar sx={{ bgcolor: green[500] }}>
                      <DoneIcon sx={{ fontSize: 15 }} color="inherit" />
                    </SmallAvatar>
                  ) : null
                }
              >
                <Avatar sx={{ width: 60, height: 60 }}>{network.icon}</Avatar>
              </Badge>
              <Typography
                variant="caption"
                display="block"
                sx={{ fontWeight: 500 }}
              >
                {network.label}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {selectedNetwork ? (
          <>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <Avatar sx={{ width: 24, height: 24, fontSize: "0.9rem" }}>
                2
              </Avatar>
              <Typography sx={{ fontWeight: 500 }}>Choose Wallet</Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={3}
              alignItems="center"
              justifyContent="space-evenly"
            >
              {wallets.map((wallet) => (
                <Stack
                  component={Button}
                  color="inherit"
                  spacing={1}
                  key={wallet.value}
                  onClick={() => handleSelectWallet(wallet.value)}
                  disabled={isConnecting}
                >
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    badgeContent={
                      selectedWallet === wallet.value ? (
                        <SmallAvatar sx={{ bgcolor: green[500] }}>
                          <DoneIcon sx={{ fontSize: 15 }} color="inherit" />
                        </SmallAvatar>
                      ) : null
                    }
                  >
                    <Avatar sx={{ width: 60, height: 60 }}>
                      {wallet.icon}
                    </Avatar>
                  </Badge>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ fontWeight: 500 }}
                  >
                    {wallet.label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </>
        ) : null}

        {connectError ? (
          <Box mt={3}>
            <Alert severity="error">{connectError}</Alert>
          </Box>
        ) : isConnecting ? (
          <Box mt={3}>
            <Alert severity="info">
              Check your wallet to approve the connection.
            </Alert>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          fullWidth
          onClick={handleConnectClick}
          disabled={
            Boolean(account && library) ||
            isConnecting ||
            !selectedNetwork ||
            !selectedWallet
          }
        >
          {isConnecting ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={18} />
              <span>Connecting…</span>
            </Stack>
          ) : account && library ? (
            "Connected"
          ) : (
            "Connect"
          )}
        </Button>
      </DialogActions>

      <Menu
        anchorEl={installMenuAnchorEl}
        open={Boolean(installMenuAnchorEl)}
        onClose={handleInstallMenuClose}
        MenuListProps={{ dense: true }}
      >
        <MenuItem disabled>
          <ListItemIcon>
            <InfoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="MetaMask not detected"
            secondary="Install the extension, then click Connect again."
          />
        </MenuItem>
        <Divider />
        <MenuItem
          component="a"
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          onClick={handleInstallMenuClose}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Install MetaMask" />
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default NetworkWalletProviders;
