import React, { useCallback, useEffect, useMemo, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { ethers } from 'ethers'
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import HDWalletProvider from '@truffle/hdwallet-provider'


function App() {

  const [error, setError] = useState<string>('')

  const [provider, setProvider] = useState<any>();
  const [library, setLibrary] = useState<ethers.providers.Web3Provider>();
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner>();
  const [account, setAccount] = useState('');
  const [network, setNetwork] = useState<ethers.providers.Network>();
  const [isConnected, setIsConnected] = useState<boolean>(false)

  const [tempNetId, setTempNetId] = useState<any>();
  const [whoPaying, setWhoPaying] = useState<'admin' | 'user'>('user')
  const [payment, setPayment] = useState({ to: '', value: '0.01' })
  const [adminPayment] = useState({
    network: 'rinkeby',
    key: process.env.REACT_APP_ORG_PRIVATE_KEY!,
    from: process.env.REACT_APP_ORG_PUBLIC_ADDRESS!,
    to: process.env.REACT_APP_USER_ADDRESS!,
    value: '0.01'
  })
  const [tranx, setTranx] = useState<any>()
  const infuraId = process.env.REACT_APP_INFURA_ID


  const web3Modal = useMemo(() => {
    const providerOptions = {
      // injected: {package: false},
      coinbasewallet: {
        package: CoinbaseWalletSDK,
        options: {
          appName: "Demo Dapp",
          infuraId: infuraId
        }
      },
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: infuraId
        }
      },
      binancechainwallet: {
        package: true
      }
    }
    return new Web3Modal({ cacheProvider: true, providerOptions })
  }, [infuraId])

  const refreshState = () => {
    setAccount('')
    setNetwork(undefined)
    setIsConnected(false)
  };

  const disconnect = useCallback(async () => {
    // web3Modal.clearCachedProvider()
    refreshState()
  }, [])

  const connectWallet = useCallback(async () => {
    try {
      console.log('connecting wallet...')

      web3Modal.clearCachedProvider()
      const provider = await web3Modal.connect();
      setProvider(provider);
      const library = new ethers.providers.Web3Provider(provider);
      setLibrary(library);
      const network = await library.detectNetwork()
      setNetwork(network);
      const signer = library.getSigner();
      setSigner(signer);

      const accounts = await library.listAccounts()!
      if (accounts) {
        setIsConnected(true)
        setAccount(accounts[0])
      }
      else {
        web3Modal.clearCachedProvider()
        setIsConnected(false)
        setAccount('')
      }

      console.log('done connecting!')

    } catch (error: any) {
      setError(error?.message!)
    }
  }, [web3Modal])

  // hook to listen to subscribed events
  useEffect(() => {
    try {
      if (provider?.on) {
        const handleAccountsChanged = async (account: string[]) => {
          console.log('account changed', account)

          const accounts = await library?.listAccounts()!
          if (accounts.length > 0) {
            setIsConnected(true)
            setAccount(accounts[0])
          }
          else {
            web3Modal.clearCachedProvider()
            setIsConnected(false)
            setAccount('')
            setNetwork(undefined)
          }
        };

        const handleChainChanged = async (chainId: number) => {
          if (!isConnected) return

          console.log('chain changed', chainId)

          // const network = await library?.getNetwork()!
          const network = await library?.detectNetwork()!
          console.log('network', network)
          setNetwork(network)
        };

        const handleDisconnect = () => {
          console.log('disconnected')
          disconnect()
        };

        provider.on("accountsChanged", handleAccountsChanged);
        provider.on("chainChanged", handleChainChanged);
        provider.on("disconnect", handleDisconnect);

        return () => {
          if (provider.removeListener) {
            provider.removeListener("accountsChanged", handleAccountsChanged);
            provider.removeListener("chainChanged", handleChainChanged);
            provider.removeListener("disconnect", handleDisconnect);
          }
        };
      }
    } catch (error: any) {
      setError(error?.message)
    }
  }, [disconnect, isConnected, library, provider, web3Modal]);

  const reconnect = useCallback(async () => {
    try {
      console.log('reconnecting...')
      const provider = await web3Modal.connectTo(web3Modal.cachedProvider)
      setProvider(provider);
      const library = new ethers.providers.Web3Provider(provider);
      setLibrary(library);
      const network = await library.getNetwork();
      setNetwork(network);
      const signer = library.getSigner();
      setSigner(signer);
      const accounts = await library.listAccounts()!
      if (accounts) {
        setIsConnected(true)
        setAccount(accounts[0])
      }
      else setIsConnected(false)

      console.log('done reconnecting!')
    } catch (error: any) {
      setError(error.message)
    }
  }, [web3Modal])

  // hook to automatically connect to the cached provider
  useEffect(() => {
    console.log(web3Modal.cachedProvider)
    if (web3Modal.cachedProvider) {
      reconnect()
    }
  }, [reconnect, web3Modal.cachedProvider])

  const truncateAddress = (address: string) => {
    if (!address) return "No Account";
    const match = address.match(
      /^(0x[a-zA-Z0-9]{2})[a-zA-Z0-9]+([a-zA-Z0-9]{2})$/
    );
    if (!match) return address;
    return `${match[1]}…${match[2]}`;
  };

  const toHex = (num: string) => {
    const val = Number(num);
    return "0x" + val.toString(16);
  };

  const networkParams = {
    1666600000: {
      chainId: "0x63564c40",
      rpcUrls: ["https://api.harmony.one"],
      chainName: "Harmony Mainnet",
      nativeCurrency: { name: "ONE", decimals: 18, symbol: "ONE" },
      blockExplorerUrls: ["https://explorer.harmony.one"],
      iconUrls: ["https://harmonynews.one/wp-content/uploads/2019/11/slfdjs.png"]
    },
    42220: {
      chainId: "0xa4ec",
      rpcUrls: ["https://forno.celo.org"],
      chainName: "Celo Mainnet",
      nativeCurrency: { name: "CELO", decimals: 18, symbol: "CELO" },
      blockExplorerUrl: ["https://explorer.celo.org"],
      iconUrls: [
        "https://celo.org/images/marketplace-icons/icon-celo-CELO-color-f.svg"
      ]
    }
  };

  const handleNetworkSwitch = (e: any) => {
    const id = e.target.value;
    setTempNetId(id);
  };

  const switchNetwork = async () => {
    try {
      await library?.provider?.request!({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHex(tempNetId!) }]
      });

      const network = await library?.getNetwork()
      const accounts = await library?.listAccounts()!;
      setNetwork(network)
      setAccount(accounts[0])
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          if (networkParams.hasOwnProperty(tempNetId!)) {
            await library?.provider?.request!({
              method: "wallet_addEthereumChain",
              params: [networkParams[tempNetId! as Partial<1666600000 | 42220>]]
            });
          }
        } catch (error: any) {
          setError(error.message);
        }
      }
    }
  };

  const handleUserPayment = async () => {
    try {
      setError('')
      setTranx(undefined)

      ethers.utils.getAddress(payment.to)

      const tranx = await signer?.sendTransaction({
        to: payment.to,
        value: ethers.utils.parseEther(payment.value) // takes amount in WAI
      })!

      console.log(tranx)

      setPayment({ to: '', value: '0.01' })
      setTranx(tranx)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleAdminPayment = async () => {
    try {
      setError('')
      setTranx(undefined)

      // const provider = new HDWalletProvider([adminPayment.key])
      const provider = new HDWalletProvider(adminPayment.key, "https://rinkeby.infura.io/v3/" + infuraId)
      const library = new ethers.providers.Web3Provider(provider as ethers.providers.ExternalProvider) // unknown as 
      const signer = library.getSigner();

      ethers.utils.getAddress(adminPayment.from)
      ethers.utils.getAddress(adminPayment.to)

      const tranx = await signer.sendTransaction({
        from: adminPayment.from,
        to: adminPayment.to,
        value: ethers.utils.parseEther(adminPayment.value) // takes amount in WAI
      })!

      console.log(tranx)

      setTranx(tranx)
    } catch (error: any) {
      console.log(error)
      setError(error.message)
    }
  }

  const handleChange = (key: string, value: string) => {
    setPayment({
      ...payment,
      [key]: value
    })
  }

  return (
    <div className="App">
      <header className="App-header">

        <div className='mx-auto w-25 fs-5'>

          <div className='mb-5 d-flex flex-column'>

            <img src={logo} className="App-logo" alt="logo" />

            {
              isConnected === true ?
                <button
                  onClick={disconnect}
                  className='btn fgg-light shadow border-danger text-light w-50 mx-auto mb-2'>
                  Disconnect
                </button>
                :
                <button
                  onClick={connectWallet}
                  className='btn fgg-light shadow borderr w-50 mx-auto mb-2'>
                  Connect Wallet
                </button>
            }

            <div className='d-flex flex-column text-12'>
              <small>Connection Status: {isConnected === true ? 'Connected' : 'Not Connected'}</small>
              <small>Wallet Address: {truncateAddress(account)}</small>
              <small>Network: {network ? <>{network?.name} ({network?.chainId})</> : "No Network"}</small>
            </div>

          </div>

          {
            error && error.length > 0 &&
            <div className="alert alert-danger alert-dismissible fade show overflow-auto mb-4 text-start text-14" role="alert">
              {error}
              <button type="button" className="btn-close p-2" data-bs-dismiss="alert" aria-label="Close" onClick={() => setError('')}></button>
            </div>
          }

          <div className='mb-5 shadow p-3 text-start'>
            <h5 className='mb-4 text-start'>Switch Network</h5>
            <div className='input-group'>
              <select className='form-select' placeholder="Select network" onChange={handleNetworkSwitch}>
                <option value="3">Ropsten</option>
                <option value="4">Rinkeby</option>
                <option value="42">Kovan</option>
                <option value="1666600000">Harmony</option>
                <option value="42220">Celo</option>
              </select>
              <button className='btn bgg-light fgg-dark' onClick={switchNetwork} disabled={!network}>
                Switch Network
              </button>
            </div>
          </div>

          <div className='mb-3 shadow p-3 text-start'>

            <h5 className='mb-4'>Transfer ETH</h5>
            <div className='mb-3 w-100 d-flex justify-content-between'>
              <h6
                style={{ cursor: 'pointer' }} onClick={() => setWhoPaying('user')}
                className={`w-100 p-3 borderr-bottom rounded-top ${whoPaying === 'user' ? 'bgg-light fgg-dark' : 'bgg-dark fgg-light'}`}
              >
                <span>User Transfer</span> <br />
                <small className='text-12'>Transfer from your wallet</small>
              </h6>
              <h6
                style={{ cursor: 'pointer' }} onClick={() => setWhoPaying('admin')}
                className={`w-100 p-3 borderr-bottom rounded-top ${whoPaying === 'admin' ? 'bgg-light fgg-dark' : 'bgg-dark fgg-light'}`}
              >
                <span>Admin Transfer</span> <br />
                <small className='text-12'>Transfer from org. wallet</small>
              </h6>
            </div>

            {
              whoPaying === 'user' ?
                <div>
                  <label htmlFor="amount">Amount</label>
                  <input type="number" id='amount' min={0.01} max={0.05} step={0.005}
                    className='form-control border-none mb-3'
                    placeholder='Enter amount' value={payment.value}
                    onChange={e => handleChange('value', e.target.value)}
                  />

                  <label htmlFor="from">From</label>
                  <input type="text" id='from' disabled value={account}
                    placeholder='From wallet' className='form-control border-none mb-3'
                  />

                  <label htmlFor="to">To</label>
                  <input type="text" id="to" placeholder='To wallet'
                    className='form-control border-none mb-4' value={payment.to}
                    onChange={e => handleChange('to', e.target.value)}
                  />

                  <button onClick={handleUserPayment}
                    className='btn form-control btn-muted bgg-light fgg-dark mb-3'>
                    Pay Now
                  </button>
                </div>
                :
                <div>
                  <label htmlFor="amount">Amount</label>
                  <input type="number" id='amount' min={0.01} max={0.05} step={0.005}
                    className='form-control border-none mb-3' disabled
                    placeholder='Enter amount' value={adminPayment.value}
                  />

                  <label htmlFor="from">From</label>
                  <input type="text" id='from' disabled value={adminPayment.from}
                    placeholder='From wallet' className='form-control border-none mb-3'
                  />

                  <label htmlFor="to">To</label>
                  <input type="text" id="to" placeholder='To wallet' disabled
                    className='form-control border-none mb-4' value={adminPayment.to}
                  />

                  <button onClick={handleAdminPayment}
                    className='btn form-control btn-muted bgg-light fgg-dark mb-3'>
                    Pay Now
                  </button>
                </div>
            }

            {
              tranx &&
              <div style={{ fontSize: '16px' }} className='my-3 w-100'>
                <h5>Receipt</h5>
                <a target={'_blank'} rel="noreferrer"
                  className='fgg-light'
                  href={`https://${whoPaying === 'user' ? network?.name : adminPayment.network}.etherscan.io/tx/${tranx.hash}`}>
                  Transaction Receipt ({truncateAddress(tranx.hash)})
                </a>
              </div>
            }

          </div>

        </div>

      </header>
    </div>
  );
}

export default App;


/*
accessList: null
blockHash: null
blockNumber: null
chainId: 0
confirmations: 0
creates: null
data: "0x"
from: "0x918D40B3f6C77F567aed23c9f1B69d546f065FE7"
gasLimit: BigNumber {_hex: '0x5208', _isBigNumber: true}
gasPrice: BigNumber {_hex: '0x59682f0d', _isBigNumber: true}
hash: "0x879da54e8acc7a33b813bf6c457748045bc647a82cc0b50f20c5e966858420cb"
maxFeePerGas: BigNumber {_hex: '0x59682f0d', _isBigNumber: true}
maxPriorityFeePerGas: BigNumber {_hex: '0x59682f00', _isBigNumber: true}
nonce: 1
r: "0xd6b582e3ea59240c0348ac1349052c5c6e3b5660c815ec6f1ff2221f68ddcda5"
s: "0x59423ca554392f19b8f37e320dbc0ce3cc3730566bc5d2c0ef0efce842c5b2fc"
to: "0x1241af1c9E0B6B50B74cD34502173E08B7f1ABea"
transactionIndex: null
type: 2
v: 1
value: BigNumber {_hex: '0x2386f26fc10000', _isBigNumber: true}
wait: (confirms, timeout) => {…}
[[Prototype]]: Object
*/