// CRON JOB to add user's mobile number which it will get from dynamodb sync event to common alerts subscription topic of aws sns

const AWS = require('@aws-sdk/client-sns');
const { v4: uuidv4 } = require('uuid');

const sns = new AWS.SNSClient({ region: 'us-east-1' });

const CommonSNSTopicArn = `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:CommonAlerts`;
const EmergencySNSTopicArn = `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:EmergencyAlerts`;

exports.commonHandler = async (event) => {
  console.log('event', event);
  const { Records } = event;
  const promises = Records.map(async (record) => {
    const { eventName, dynamodb: { NewImage } } = record;
    if (eventName === 'INSERT') {
      const { mobile: { S: mobile } } = NewImage;
      console.log('Adding mobile ', mobile);
      const params = {
        Protocol: 'sms',
        TopicArn: CommonSNSTopicArn,
        Endpoint: mobile,
        ReturnSubscriptionArn: true,
        Attributes: {
          'FilterPolicy': JSON.stringify({
            'type': ['common']
          })
        },
        SubscriptionArn: uuidv4()
      };
      await sns.subscribe(params);
    }
  });
  await Promise.all(promises);
  console.log(`Successfully added ${Records.length} mobile numbers to common alerts subscription topic`);
  return 'success';
}

exports.emergencyHandler = async (event) => {
  console.log('event', event);
  const { Records } = event;
  const promises = Records.map(async (record) => {
    const { eventName, dynamodb: { NewImage } } = record;
    if (eventName === 'INSERT') {
      const { mobile: { S: mobile } } = NewImage;
      console.log('Adding mobile ', mobile);
      const params = {
        Protocol: 'sms',
        TopicArn: EmergencySNSTopicArn,
        Endpoint: mobile,
        ReturnSubscriptionArn: true,
        Attributes: {
          'FilterPolicy': JSON.stringify({
            'type': ['emergency']
          })
        },
        SubscriptionArn: uuidv4()
      };
      await sns.subscribe(params);
    }
  });
  await Promise.all(promises);
  console.log(`Successfully added ${Records.length} mobile numbers to emergency alerts subscription topic`);
  return 'success';
}

exports.sendCommonAlert = async (event) => {
  // Use dynamodb event to send common alerts to all users
  console.log('event', event);
  const { Records } = event;
  const promises = Records.map(async (record) => {
    const { eventName, dynamodb: { NewImage } } = record;
    if (eventName === 'INSERT') {
      const { title: { S: title }, description: { S: description } } = NewImage;
      console.log('Sending common alert ', title, description);

      const params = {
        Message: `${title} - ${description}`,
        TopicArn: CommonSNSTopicArn,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };
      await sns.publish(params);
      return 'success';
    }
  });
  await Promise.all(promises);
  console.log(`Successfully sent ${Records.length} common alerts`);
}

exports.sendEmergencyAlert = async (event) => {
  // Use dynamodb event to send emergency alerts to all users
  console.log('event', event);
  const { Records } = event;
  const promises = Records.map(async (record) => {
    const { eventName, dynamodb: { NewImage } } = record;
    if (eventName === 'INSERT') {
      const { title: { S: title }, description: { S: description } } = NewImage;
      console.log('Sending emergency alert ', title, description);

      const params = {
        Message: `${title} - ${description}`,
        TopicArn: EmergencySNSTopicArn,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };
      await sns.publish(params);
      return 'success';
    }
  });
  await Promise.all(promises);
  console.log(`Successfully sent ${Records.length} emergency alerts`);
}
