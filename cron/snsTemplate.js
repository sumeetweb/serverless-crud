const AWS = require('aws-sdk');
const CommonSNSTopicArn = `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:CommonAlerts`;
const EmergencySNSTopicArn = `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:EmergencyAlerts`;

exports.handler = async (event, context) => {
  // Create an SNS client

  const { message, type } = event;
  const flag = type === 'emergency' ? true : false;
  const sns = new AWS.SNS();

  // Publish the message to the SNS topic
  const params = {
    Message: message,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional' // Set to 'Promotional' for non-critical messages
      }
    },
    TopicArn: flag ? EmergencySNSTopicArn : CommonSNSTopicArn
  };

  const response = await sns.publish(params).promise();
  console.log(response);
};
