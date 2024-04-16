import React, { useState, useRef, useEffect } from 'react';
import { MessageInput } from './MessageInput';
import { MessageItem } from './MessageItem';
import { useXmtp } from '@xmtp/react-native-sdk';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  messagesContainer: {
    flex: 1,
  },
});

export const MessageContainer = ({
  conversation,
  searchTerm,
  selectConversation,
}) => {
  const isFirstLoad = useRef(true);
  const { client } = useXmtp();
  const bottomOfList = useRef(null);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const updateMessages = (prevMessages, newMessage) => {
    const doesMessageExist = prevMessages.some(
      existingMessage => existingMessage.id === newMessage.id,
    );

    if (!doesMessageExist) {
      return [...prevMessages, newMessage];
    }

    return prevMessages;
  };

  useEffect(() => {
    let isMounted = true;
    let timer;
    const fetchMessages = async () => {
      if (conversation && conversation.peerAddress && isFirstLoad.current) {
        setIsLoading(true);
        const initialMessages = await conversation?.messages();
        const orderedMessages = initialMessages.reverse();
        let updatedMessages = [];
        orderedMessages.forEach(message => {
          updatedMessages = updateMessages(updatedMessages, message);
        });

        setMessages(updatedMessages);
        setIsLoading(false);
        isFirstLoad.current = false;
      }
      // Delay scrolling to the bottom to allow the layout to update
      timer = setTimeout(() => {
        if (isMounted && bottomOfList.current) {
          bottomOfList.current.scrollToEnd({ animated: false });
        }
      }, 0);
    };

    fetchMessages();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [conversation]);

  useEffect(() => {
    const handleMessage = async message => {
      console.log('Stream', message.content());
      setMessages(prevMessages => updateMessages(prevMessages, message));
    };

    if (conversation && typeof conversation.streamMessages === 'function') {
      const unsubscribe = conversation.streamMessages(handleMessage);
      return () => {
        console.log('Unsubscribing from message stream');
        // Call unsubscribe(); if you want to cancel the stream when the component is unmounted
      };
    }
  }, [conversation]);

  useEffect(() => {
    if (bottomOfList.current) {
      bottomOfList.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async newMessage => {
    if (!newMessage.trim()) {
      Alert.alert('Empty message');
      return;
    }
    if (conversation && conversation.peerAddress) {
      await conversation.send(newMessage);
    } else if (conversation) {
      const conv = await client.conversations.newConversation(searchTerm);
      selectConversation(conv);
      await conv.send(newMessage);
    }
  };

  return (
    <>
    {isLoading ? (
  <Text>Loading messages...</Text>
) : (
  <View style={styles.container}>
 <ScrollView style={styles.messagesContainer} ref={bottomOfList}>
  {messages.map(message => (
    message.content() && (
      <MessageItem
        key={message.id}
        message={message}
        senderAddress={message.senderAddress}
        client={client}
      />
    )
  ))}
</ScrollView>

  <MessageInput
    onSendMessage={msg => {
      handleSendMessage(msg);
    }}
  />
</View>
      )}
    </>
  );
};
