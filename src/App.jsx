import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;
import kp from './keypair.json'



// Constants
const TEST_GIFS = [
 'https://media.giphy.com/media/3o72EX5QZ9N9d51dqo/giphy.gif',
 'https://media.giphy.com/media/6VoDJzfRjJNbG/giphy.gif',
 'https://media.giphy.com/media/OmK8lulOMQ9XO/giphy.gif',
]
// const GIT_HANDLE = 'padrone1225';
// const GIT_LINK = `https://github.com/${GIT_HANDLE}`;

const { SystemProgram, Keypair } = web3;

//let baseAccount = Keypair.generate();

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl('devnet');

const opts = {
  preflightCommitment: "processed"
}

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  const checkIfWalletConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          const response = await solana.connect({onlyIfTrusted: true});
          console.log('Connected with Public Key:',response.publicKey.toString());
          setWalletAddress(response.publicKey.toString());
        }
      } else {
          console.log("Solana object not found, install phantom wallet extension");
        }
    } catch(error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    console.log("Wallet connect clicked");
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Wallet connected with public key: ",response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }

  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
  
      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue)
  
      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(connection, window.solana, opts.preflightCommitment);
    return provider;
  }

  const createGifAccount = async () => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    console.log("ping")
    await program.rpc.startStuffOff({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount]
    });
    console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
    await getGifList();

  } catch(error) {
    console.log("Error creating BaseAccount account:", error)
  }
}

const upvoteItem = async (index) => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    console.log("ping");
    console.log("index: ",index);
    await program.rpc.updateItem(index.toString(),{
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
      },
    });
  } catch(error) {
    console.log("Error in upvote of Gif");
  }
}

const sendTip = async (userAddress) => {
  try {

    const provider = window.solana;
    //const program = new Program(idl, programID, provider);
    var connection = new web3.Connection(
      web3.clusterApiUrl('devnet'),
    );
    console.log("to send sol to , amount",userAddress,web3.LAMPORTS_PER_SOL/100);

    var transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: userAddress,
        lamports: web3.LAMPORTS_PER_SOL //Investing 1 SOL. Remember 1 Lamport = 10^-9 SOL.
      }),
    );

    // Setting the variables for the transaction
    transaction.feePayer = await provider.publicKey;
    let blockhashObj = await connection.getRecentBlockhash();
    transaction.recentBlockhash = await blockhashObj.blockhash;

    // Transaction constructor initialized successfully
    if(transaction) {
      console.log("Txn created successfully");
    }
    
    // Request creator to sign the transaction (allow the transaction)
    let signed = await provider.signTransaction(transaction);
    // The signature is generated
    let signature = await connection.sendRawTransaction(signed.serialize());
    // Confirm whether the transaction went through or not
    await connection.confirmTransaction(signature);

    //Signature chhap diya idhar
    console.log("Signature: ", signature);

  } catch(error) {
    console.error("error in sending sol",error);
  }
}

  const renderNotConnectedContainer = () => (
    <button className="cta-button connect-wallet-button" onClick={connectWallet}>
    Connect to Wallet
    </button>
  );

const renderConnectedContainer = () => {
	// If we hit this, it means the program account hasn't be initialized.
  if (gifList === null) {
    return (
      <div className="connected-container">
        <button className="cta-button submit-gif-button" onClick={createGifAccount}>
          Do One-Time Initialization For GIF Program Account
        </button>
      </div>
    )
  } 
	// Otherwise, we're good! Account exists. User can submit GIFs.
	else {
    return(
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>
        <div className="gif-grid">
          {/* We use index as the key instead, also, the src is now item.gifLink */}
          {gifList.map((item, index) => (
            <div className="gif-item" key={index}>
              <img src={item.gifLink} />
              <button type ="button" onClick={() => upvoteItem(index)}> <b>Upvote { item.upvotes.toString() } </b> </button>
              <button type = "button" onClick = { () => sendTip(item.userAddress.toString()) }> <b> SendSolTip </b></button>
              <div>
               { item.userAddress.toString() }
              </div>
            </div>
          ))}
        </div> 
      </div>
    )
  }
}

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletConnected();
    };
    window.addEventListener('load', onLoad);
    return() => window.removeEventListener('load', onLoad);
  },[]);

const getGifList = async () => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

    console.log("Got the account!",account);
    setGifList(account.gifsList);
  } catch(error) {
    console.error("Error fetching account",error,baseAccount.publicKey);
    setGifList(null);
  }
}

useEffect(() => {
  if (walletAddress) {
    console.log("Fetching gif list...");
    getGifList();
  }
},[walletAddress]);


  return (
    <div className="App">
      <div className="container">
      <div className={walletAddress? 'authed-container' : 'container'} >
        <div className="header-container">
          <p className="header">Cats GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          { !walletAddress && renderNotConnectedContainer() }
          {  walletAddress && renderConnectedContainer() }
        </div>
        <div className="footer-container">
          {/* <a
            className="footer-text"
            href={GIT_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${GIT_HANDLE}`}</a> */}
        </div>
      </div>
      </div>
    </div>
  );
};

export default App;
