import React, { useCallback, useEffect, useMemo, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { ethers } from 'ethers'

declare var window: any

function AppMetaMask() {

  const [connectedWalletAddr, setConnectedWalletAddr] = useState('')
  const [payment, setPayment] = useState({ address: '', amount: '0.01' })
  const [error, setError] = useState('')
  const [tranxHash, setTranxHash] = useState('')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isConnectable, setIsConnectable] = useState<boolean>()
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner>()


  const provider = useMemo(
    () => {
      return (!window.ethereum) ? undefined :
        new ethers.providers.Web3Provider(window.ethereum)
    }, [])

  const getWalletAddress = useCallback(async () => {
    console.log('getting wallets...')
    const accounts = await provider?.listAccounts()!
    if (accounts.length > 0) {
      setConnectedWalletAddr(accounts[0])
      setIsConnected(true)
    } else {
      setConnectedWalletAddr('')
      setIsConnected(false)
    }
  }, [provider])

  const checkConnection = useCallback(async () => {
    try {
      if (window.ethereum) {
        setSigner(provider?.getSigner())
        setIsConnectable(true)

        // get connected wallet address
        await getWalletAddress()

        // Subscribe to accounts change *
        window.ethereum.on('accountsChanged', async (accounts: string[]) => {
          console.log('accountsChanged', accounts);
          await getWalletAddress()
        });

        // Subscribe to chainId change *
        window.ethereum.on('chainChanged', async (chainId: number) => {
          console.log('chainChanged', chainId);
          await getWalletAddress()
        });
      }
    } catch (error: any) {
      setIsConnectable(false)
      console.log(error.message)
    }
  }, [getWalletAddress, provider])

  useEffect(() => {
    if (isConnectable === undefined) {
      setIsConnectable(false)
      checkConnection()
    }
  }, [checkConnection, isConnectable])

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('No crypto wallet found! Install MetaMask extension!')
      } else {
        await window.ethereum.send('eth_requestAccounts')
        await getWalletAddress()
      }
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handlePayment = async () => {
    try {
      setError('')
      if (!window.ethereum) {
        throw new Error('No crypto wallet found! Install MetaMask extension!')
      } else {
        console.log(payment)
        setTranxHash('')

        ethers.utils.getAddress(payment.address)
        const tranx = await signer?.sendTransaction({
          to: payment.address,
          value: ethers.utils.parseEther(payment.amount) // takes amount in WAI
        })!
        
        console.log(tranx)
        setTranxHash(tranx.hash)

        setPayment({ address: '', amount: '' })
      }
    } catch (error: any) {
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
              isConnectable === true
                ?
                <>
                  <button
                    disabled={isConnected} onClick={connectWallet}
                    className='btn fgg-light shadow borderr w-50 mx-auto mb-2'>
                    {isConnected === true ? 'Connected' : 'Connect Wallet'}
                  </button>
                  <small style={{ fontSize: '12px' }}>{connectedWalletAddr}</small>
                </>
                :
                <p>No crypto wallet found! Install MetaMask extension!</p>
            }
          </div>

          {
            error.length > 0 &&
            <div className='alert alert-danger mb-4 fs-6 text-start'>{error}</div>
          }

          {
            isConnectable &&
            <>
              <h5 className='mb-2 text-start'>Transfer ETH</h5>
              <div className='mb-3 shadow p-3 text-start'>

                <label htmlFor="amount">Amount</label>
                <input type="number" id='amount' min={0.01} max={0.05} step={0.005}
                  className='form-control border-none mb-3'
                  placeholder='Enter amount' value={payment.amount}
                  onChange={e => handleChange('amount', e.target.value)}
                />

                <label htmlFor="from">From</label>
                <input type="text" id='from' disabled value={connectedWalletAddr}
                  placeholder='From wallet' className='form-control border-none mb-3'
                />

                <label htmlFor="to">To</label>
                <input type="text" id="to" placeholder='To wallet'
                  className='form-control border-none mb-4' value={payment.address}
                  onChange={e => handleChange('address', e.target.value)}
                />

                <button onClick={handlePayment}
                  className='btn form-control btn-muted bgg-light fgg-dark mb-3'>
                  Pay Now
                </button>

                {
                  tranxHash &&
                  <>
                    <div className='w-100 overflow-auto mb-4'>{tranxHash}</div>
                    <a href={`https://rinkeby.etherscan.io/tx/${tranxHash}`}>Receipt</a>
                  </>
                }

              </div>
            </>
          }

        </div>

      </header>
    </div>
  );
}

export default AppMetaMask;
