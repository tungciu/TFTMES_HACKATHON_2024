import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useXmtp } from '@xmtp/react-native-sdk';

export const MessageItem = ({ message, senderAddress }) => {
  const { client } = useXmtp();

  const renderMessage = () => {
  try {
    const content = message?.content();
    console.log('Content:', content); // In ra giá trị của content
    
    // Kiểm tra nếu không có nội dung
    if (!content) {
      return <Text style={styles.renderedMessage}>No content available</Text>;
    }

    // Kiểm tra nếu nội dung có thuộc tính remoteAttachment
    if (content.remoteAttachment && content.remoteAttachment.url) {
      const { url, filename } = content.remoteAttachment;
      const fileExtension = filename.split('.').pop().toLowerCase(); // Lấy phần mở rộng của tên tệp và chuyển thành chữ thường
      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        // Nếu là ảnh, hiển thị nó bằng thành phần <Image>
        return <Image source={{ uri: url }} style={styles.image} />;
      } else {
        // Xử lý nội dung theo cách khác tùy thuộc vào loại nội dung
        return <Text style={styles.renderedMessage}>Unsupported file format</Text>;
      }
    }

    // Kiểm tra nếu nội dung là chuỗi và không rỗng
    if (typeof content === 'string' && content.length > 0) {
      return <Text style={styles.renderedMessage}>{content}</Text>;
    }

    // Nếu không xác định được loại nội dung, trả về chuỗi 'b'
    return <Text style={styles.renderedMessage}>b</Text>;
  } catch (error) {
    console.error('Error rendering message:', error);
    return <Text style={styles.renderedMessage}>Error rendering message</Text>;
  }
};

const isSender = client && senderAddress === client?.address;

return (
  <View
    style={isSender ? styles.senderMessage : styles.receiverMessage}
    key={message.id}>
    <View style={styles.messageContent}>
      {renderMessage()}
      <View style={styles.footer}>
        <Text style={styles.timeStamp}>
          {`${new Date(message.sent).getHours()}:${String(
            new Date(message.sent).getMinutes(),
          ).padStart(2, '0')}`}
        </Text>
      </View>
    </View>
  </View>
);

};

const styles = StyleSheet.create({
   senderMessage: {
    alignSelf: 'flex-end', // Tin nhắn của bạn sẽ được căn phải
    textAlign: 'right', // Nếu cần
  },
  receiverMessage: {
    alignSelf: 'flex-start', // Tin nhắn của đối phương sẽ được căn trái
    textAlign: 'left', // Nếu cần
  },
  messageContent: {
    padding: 10,
    margin: 5,
    borderRadius: 5,
    maxWidth: '80%',
  },
  renderedMessage: {
    fontSize: 16,
  },
  image: {
    width: 200,
    height: 200,
  },
  timeStamp: {
    fontSize: 8,
    color: 'grey',
  },
});

export default MessageItem;
