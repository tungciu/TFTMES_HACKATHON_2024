import React, {useState, useEffect} from 'react';
import {Client, useXmtp} from '@xmtp/react-native-sdk';
import {ethers} from 'ethers';
import {ConversationContainer} from './ConversationContainer';
import {View, Text, Button, StyleSheet, TouchableOpacity} from 'react-native';
import Config from 'react-native-config';
import { useSDK } from "@metamask/sdk-react";
// import detectEthereumProvider from "@metamask/detect-provider";

// const myPrivateKey = "0xcc362ddcadfb1e2826aa3a7e2c6cf08121e8946617b9a870a0ca5e610b830c14";
const myPrivateKey = "15c042b79999b73ca8cec027d45bb2da30f5173a96b92de644f3435ff28532d0";
const infuraKey = "b1528436726c44f0a6c739baf91e04fb";
console.log('infuraKey', Config);
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
  uContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 10,
    zIndex: 1000,
    overflow: 'hidden',
  },
  logoutBtnContainer: {
    padding: 10, // adjust as needed
  },
  logoutBtn: {
    position: 'absolute',
    top: 10,
    right: 5,
    color: '#000',
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 10,
  },
  widgetHeader: {
    padding: 2,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'none',
    borderWidth: 0,
    width: 'auto',
    margin: 0,
  },
  conversationHeaderH4: {
    margin: 0,
    padding: 4,
    fontSize: 14, // Increased font size
  },
  backButton: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: 14, // Increased font size
  },
  widgetContent: {
    flexGrow: 1,
  },
  xmtpContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  btnXmtp: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    color: '#000',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'grey',
    padding: 10,
    borderRadius: 5,
    fontSize: 14,
  },
});

export function FloatingInbox({wallet, env, onLogout}) {
  const [isOnNetwork, setIsOnNetwork] = useState(false);
  const {client, setClient} = useXmtp();
  const [isConnected, setIsConnected] = useState(false);
  const { connect } = useSDK();
  useEffect(() => {
    (async () => {
      const initialIsOnNetwork =
        (await AsyncStorage.getItem('isOnNetwork')) === 'true' || false;
      const initialIsConnected =
        ((await AsyncStorage.getItem('isConnected')) && wallet === 'true') ||
        false;

      setIsOnNetwork(initialIsOnNetwork);
      setIsConnected(initialIsConnected);
    })();
  }, []);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [signer, setSigner] = useState();

  useEffect(() => {
    if (wallet) {
      setSigner(wallet);
      setIsConnected(true);
    }
    if (client && !isOnNetwork) {
      setIsOnNetwork(true);
    }
    if (signer && isOnNetwork && isConnected) {
      //initXMTP();
      initXmtpWithKeys();
    }
  }, [wallet, isOnNetwork, isConnected]);

  useEffect(() => {
    AsyncStorage.setItem('isOnNetwork', isOnNetwork.toString());
    AsyncStorage.setItem('isConnected', isConnected.toString());
  }, [isConnected, isOnNetwork]);

  const connectWallet = async () => {
    try {
      await connect();
      const provider = ethers.getDefaultProvider(); // Sử dụng provider mặc định từ thư viện ethers
      const signerXmtp = new ethers.Wallet(provider); // Tạo signer từ provider
      setSigner(signerXmtp);
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting wallet', error);
    }
  };

  const getAddress = async signer => {
    try {
      if (signer && typeof signer.getAddress === 'function') {
        return await signer.getAddress();
      } else if (signer && typeof signer.getAddresses === 'function') {
        //viem
        const [address] = await signer.getAddresses();
        return address;
      } else if (signer.address) {
        return signer.address;
      } else return null;
    } catch (e) {
      console.log(e);
    }
  };

  const createNewWallet = async () => {
    try {
      const clientOptions = {
        env: env ? env : getEnv(),
      };
      console.log('clientOptions', clientOptions);
      const xmtpClient = await Client.createRandom(clientOptions.env);
      setIsConnected(true);
      setSigner(xmtpClient);
      setClient(xmtpClient);
      setIsOnNetwork(true);
    } catch (error) {
      console.error('Error creating new wallet', error);
    }
  };

  const handleLogout = async () => {
    setIsConnected(false);
    setSigner(null);
    setIsOnNetwork(false);
    setClient(null);
    setSelectedConversation(null);
    const address = await getAddress(signer);
    wipeKeyBundle(address);
    AsyncStorage.removeItem('isOnNetwork');
    AsyncStorage.removeItem('isConnected');
    if (typeof onLogout === 'function') {
      onLogout();
    }
  };

  const startFromPrivateKey = async () => {
    try {
      console.log(myPrivateKey);
      const infuraProvider = new ethers.InfuraProvider('mainnet', infuraKey);
      const signerEthers = new ethers.Wallet(myPrivateKey, infuraProvider);
      setSigner(signerEthers);
      setIsConnected(true);
    } catch (error) {
      console.error('Error creating new wallet', error);
    }
  };
  const initXmtpWithKeys = async function () {
    try {
      if (!signer) {
        handleLogout();
        return;
      }
      const clientOptions = {
        env: env ? env : getEnv(),
      };

      let address = await getAddress(signer);

      let keys = await loadKeyBundle(address);
      if (!keys) {
        const xmtp = await Client.create(signer, clientOptions);
        setClient(xmtp);
        keys = await xmtp.exportKeyBundle(xmtp.address);
        storeKeyBundle(xmtp.address, keys);
        setIsOnNetwork(!!xmtp.address);
      } else {
        const xmtp = await Client.createFromKeyBundle(keys, clientOptions);
        setClient(xmtp);
        setIsOnNetwork(!!xmtp.address);
      }
    } catch (error) {
      console.error('Error initializing XMTP with keys', error);
    }
  };

  return (
    <View style={{flex: 1}}>
      <View style={styles.uContainer}>
        {isConnected && (
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtnContainer}>
            <Text style={styles.logoutBtn}>Logout</Text>
          </TouchableOpacity>
        )}
        {isConnected && isOnNetwork && (
          <View style={styles.widgetHeader}>
            <View style={styles.conversationHeader}>
              {isOnNetwork && selectedConversation && (
                <Button
                  title="←"
                  onPress={() => {
                    setSelectedConversation(null);
                  }}
                  style={styles.backButton}
                />
              )}
              <Text style={styles.conversationHeaderH4}>Conversations</Text>
            </View>
          </View>
        )}
        <View style={styles.widgetContent}>
          {!isConnected && (
            <View style={styles.xmtpContainer}>
              <Button
                title="Connect Wallet"
                onPress={connectWallet}
                style={styles.btnXmtp}
              />
              <Text style={styles.label} onPress={createNewWallet}>
                or create new one
              </Text>
              <Text style={styles.label} onPress={startFromPrivateKey}>
                or start from key
              </Text>
            </View>
          )}
          {isConnected && !isOnNetwork && (
            <View style={styles.xmtpContainer}>
              <Button
                title="Connect to XMTP"
                onPress={initXmtpWithKeys}
                style={styles.btnXmtp}
              />
            </View>
          )}
          {isConnected && isOnNetwork && client && (
            <ConversationContainer
              client={client}
              selectedConversation={selectedConversation}
              setSelectedConversation={setSelectedConversation}
            />
          )}
        </View>
      </View>
    </View>
  );
}

export const getEnv = () => {
  // "dev" | "production" | "local"
  return typeof process !== 'undefined' && process.env.REACT_APP_XMTP_ENV
    ? process.env.REACT_APP_XMTP_ENV
    : 'production';
};

export const buildLocalStorageKey = walletAddress => {
  return walletAddress ? `xmtp:${getEnv()}:keys:${walletAddress}` : '';
};

export const loadKeyBundle = async address => {
  const keyBundle = await AsyncStorage.getItem(buildLocalStorageKey(address));
  //console.log(buildLocalStorageKey(address), keyBundle);
  return keyBundle;
};
export const storeKeyBundle = async (address, keyBundle) => {
  //console.log(buildLocalStorageKey(address), keyBundle);
  await AsyncStorage.setItem(buildLocalStorageKey(address), keyBundle);
};
export const wipeKeyBundle = async address => {
  await AsyncStorage.removeItem(buildLocalStorageKey(address));
};