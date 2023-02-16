// AWS SNS Utils for sending SMS messages and Push Notifications

const sns = require('@aws-sdk/client-sns');

module.exports.sendSMS = (phoneNumber, message) => {
  const params = {
    Message: message,
    PhoneNumber: phoneNumber,
  };
  return sns.publish(params).promise();
}

module.exports.sendPushNotification = (arn, message) => {
  const params = {
    Message: message,
    TargetArn: arn,
  };
  return sns.publish(params).promise();
}

module.exports.subscribeToTopic = (phoneNumber, topicArn) => {
  const params = {
    Protocol: 'sms',
    TopicArn: topicArn,
    Endpoint: phoneNumber,
  };
  return sns.subscribe(params).promise();
}

module.exports.unsubscribeFromTopic = (subscriptionArn) => {
  const params = {
    SubscriptionArn: subscriptionArn,
  };
  return sns.unsubscribe(params).promise();
}

module.exports.createTopic = (name) => {
  const params = {
    Name: name,
  };
  return sns.createTopic(params).promise();
}

module.exports.deleteTopic = (topicArn) => {
  const params = {
    TopicArn: topicArn,
  };
  return sns.deleteTopic(params).promise();
}

module.exports.listSubscriptionsByTopic = (topicArn) => {
  const params = {
    TopicArn: topicArn,
  };
  return sns.listSubscriptionsByTopic(params).promise();
}

module.exports.listTopics = () => {
  return sns.listTopics().promise();
}

module.exports.publishToTopic = (topicArn, message) => {
  const params = {
    Message: message,
    TopicArn: topicArn,
  };
  return sns.publish(params).promise();
}