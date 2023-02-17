// CRON JOB to add user's mobile number which it will get from dynamodb sync event to common alerts subscription topic of aws sns

const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const CommonSNSTopicArn = `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:CommonAlerts`;
const EmergencySNSTopicArn = `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:EmergencyAlerts`;
const { v4: uuidv4 } = require('uuid');

exports.commonHandler = async (event) => {
  console.log('event', event);
  const { Records } = event;
  const promises = Records.map(async (record) => {
    const { eventName, dynamodb: { NewImage }, eventSourceARN } = record;
    if (eventName === 'INSERT' && eventSourceARN.includes('users')) {
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
    const { eventName, dynamodb: { NewImage }, eventSourceARN } = record;
    if (eventName === 'INSERT' && eventSourceARN.includes('users')) {
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
  console.log('event', event);
  const { Records } = event;
  if (Records[0].eventName === 'INSERT' && Records[0].eventSourceARN.includes('alerts') && Records[0].dynamodb.NewImage.type.S === 'common') {
    const sns = new AWS.SNS();
    const message = Records[0].dynamodb.NewImage.title.S + ' ' + Records[0].dynamodb.NewImage.description.S;
    const params = {
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      },
      TopicArn: CommonSNSTopicArn
    };

    const response = await sns.publish(params).promise();
    return response;
  }
}

exports.sendEmergencyAlert = async (event) => {
  console.log('event', event);
  const { Records } = event;

  if (Records[0].eventName === 'INSERT' && Records[0].eventSourceARN.includes('alerts') && Records[0].dynamodb.NewImage.type.S === 'emergency') {
    const sns = new AWS.SNS();
    const message = Records[0].dynamodb.NewImage.title.S + ' ' + Records[0].dynamodb.NewImage.description.S;
    const params = {
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      },
      TopicArn: EmergencySNSTopicArn
    };

    const response = await sns.publish(params).promise();
    return response;
  }
}
