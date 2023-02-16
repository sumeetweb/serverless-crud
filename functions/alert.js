const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const express = require("express");
const serverless = require("serverless-http");

// Imports
const authHandler = require("../utils/authHandler");

const cors = require("cors");

const app = express();

const ALERTS_TABLE = process.env.ALERTS_TABLE;
const client = new DynamoDBClient();
const dynamoDbClient = DynamoDBDocumentClient.from(client);

app.use(express.json());
app.use(cors());

app.get("/alerts", authHandler.validate, async (req, res) => {
  const params = {
    TableName: ALERTS_TABLE,
  };

  try {
    const data = await dynamoDbClient.send(new ScanCommand(params));
    return res.json(data.Items);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/alerts/:id", authHandler.validate, async (req, res) => {
  const params = {
    TableName: ALERTS_TABLE,
    Key: {
      id: req.params.id,
    },
  };

  try {
    const data = await dynamoDbClient.send(new GetCommand(params));
    return res.json(data.Item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/alerts", authHandler.validate, async (req, res) => {
  const { title, description, type } = req.body;
  const params = {
    TableName: ALERTS_TABLE,
    Item: {
      id: uuidv4(),
      title,
      description,
      type,
      createdAt: Date.now(),
      status: "PENDING"
    },
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    return res.json(params.Item.append({ message: "Alert Sent Successfully" }));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/alerts/:id", authHandler.validateAdmin, async (req, res) => {
  const { status } = req.body;

  if(!["PENDING", "APPROVED", "REJECTED"].includes(status)) 
    return res.status(400).json({ error: "Invalid Status" });

  const params = {
    TableName: ALERTS_TABLE,
    Key: {
      id: req.params.id,
    },
    UpdateExpression: "set #status = :status",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":status": status,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const data = await dynamoDbClient.send(new UpdateCommand(params));
    return res.json(data.Attributes);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


module.exports.handler = serverless(app);
