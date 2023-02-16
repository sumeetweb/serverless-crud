const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const express = require("express");
const serverless = require("serverless-http");

// Imports
const bcrypt = require("bcrypt");
const authHandler = require("../utils/authHandler");

const cors = require("cors");

const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const client = new DynamoDBClient();
const dynamoDbClient = DynamoDBDocumentClient.from(client);

app.use(express.json());
app.use(cors());

app.options("/*", function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.send(200);
});

app.post("/users/signup", async function (req, res) {
  const { userId, name, password, mobile, userGroup, userType } = req.body;

  // Validate userId 
  if (typeof userId !== "string") {
    return res.status(400).json({ error: '"userId" must be a string' });
  }

  // Validate name
  if (typeof name !== "string") {
    return res.status(400).json({ error: '"name" must be a string' });
  }

  // Validate password
  if (typeof password !== "string") {
    return res.status(400).json({ error: '"password" must be a string' });
  } else if (password.length < 6) {
    return res.status(400).json({ error: '"password" length must be 6 characters long' });
  }

  // Validate mobile
  if (typeof mobile !== "string") {
    return res.status(400).json({ error: '"mobile" must be a string' });
  } else if (mobile.length < 10) {
    return res.status(400).json({ error: '"mobile" length must be 10 characters long' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      name: name,
      password: hashedPassword,
      mobile: mobile,
      userGroup: [userGroup],
      userType: userType,
    },
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    const token = authHandler.generateToken(params.Item);
    return res.json({ userId, name, token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not create user" });
  }
});


app.post("/users/login", async function (req, res) {
  const { userId, password } = req.body;

  // Validate userId
  if (typeof userId !== "string") {
    return res.status(400).json({ error: '"userId" must be a string' });
  }

  // Validate password
  if (typeof password !== "string") {
    return res.status(400).json({ error: '"password" must be a string' });
  } else if (password.length < 6) {
    return res.status(400).json({ error: '"password" length must be 6 characters long' });
  }

  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));
    if (Item) {
      const { userId, name } = Item;
      const passwordsMatch = await bcrypt.compare(password, Item.password);
      if (passwordsMatch) {
        const token = authHandler.generateToken(userId);
        return res.json({ userId, name, token });
      }
      return res.status(401).json({ error: "Passwords do not match" });
    }
    return res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not retreive user" });
  }
});


app.post("/admin/login", async function (req, res) {
  const { userId, password } = req.body;

  // Validate userId
  if (typeof userId !== "string") {
    return res.status(400).json({ error: '"userId" must be a string' });
  }

  // Validate password
  if (typeof password !== "string") {
    return res.status(400).json({ error: '"password" must be a string' });
  } else if (password.length < 6) {
    return res.status(400).json({ error: '"password" length must be 6 characters long' });
  }

  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));
    if (Item) {
      const { userId, name } = Item;
      const passwordsMatch = await bcrypt.compare(password, Item.password);
      if (passwordsMatch) {
        const token = authHandler.generateToken(userId);
        return res.json({ userId, name, token });
      }
      return res.status(401).json({ error: "Passwords do not match" });
    }
    return res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not retreive user" });
  }
});

app.post("/admin/add", async function (req, res) {
  const { userId, name, password, mobile, userGroup, userType } = req.body;

  // Validate Admin JWT Token
  const token = req.headers.authorization || false;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decodedToken = authHandler.validateAdmin(token);
  if (!decodedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { userId: adminUserId } = decodedToken;
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: adminUserId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));
    if (Item) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const params = {
        TableName: USERS_TABLE,
        Item: {
          userId: userId,
          name: name,
          password: hashedPassword,
          mobile: mobile,
          userGroup: [userGroup],
          userType: userType,
        },
      };

      try {
        await dynamoDbClient.send(new PutCommand(params));
        return res.json({ userId, name });
      } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Could not create user" });
      }
    }
    return res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not retreive user" });
  }
});

app.get("/users", async function (req, res) {
  // Validate Admin JWT Token
  const token = req.headers.authorization || false;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const decodedToken = authHandler.validateAdmin(token);
  if (!decodedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const params = {
    TableName: USERS_TABLE,
    // Don't return the users whose userGroup includes "admin"
    FilterExpression: "NOT contains(userGroup, :userGroup)",
    ExpressionAttributeValues: {
      ":userGroup": "admin",
    },
  };

  try {
    const { Items } = await dynamoDbClient.send(new ScanCommand(params));
    return res.json(Items);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not retreive users" });
  }
});

app.get("/users/:userId", async function (req, res) {
  const { userId } = req.params;
  const token = req.headers.authorization || false;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decodedToken = authHandler.validateAdmin(token) || authHandler.validate(token);
  if (!decodedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));

    if (Item) {
      if (Item.userId !== decodedToken.userId || !decodedToken.userGroup.includes("admin")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      return res.json(Item);
    }
    return res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not retreive user" });
  }
});

app.post("/users/:userId", async function (req, res) {
  const { userId } = req.params;
  const { name, mobile, userGroup, userType } = req.body;

  // Validate Admin JWT Token
  const token = req.headers.authorization || false;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decodedToken = authHandler.validateAdmin(token) || authHandler.validate(token);
  if (!decodedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate Req Body
  if (typeof name !== "string") {
    return res.status(400).json({ error: '"name" must be a string' });
  } else if (name.length < 1) {
    return res.status(400).json({ error: '"name" length must be at least 1 character long' });
  } else if (typeof mobile !== "string") {
    return res.status(400).json({ error: '"mobile" must be a string' });
  } else if (mobile.length < 1) {
    return res.status(400).json({ error: '"mobile" length must be at least 1 character long' });
  } else if (typeof userGroup !== "array") {
    return res.status(400).json({ error: '"userGroup" must be a array' });
  } else if (userGroup.length < 1) {
    return res.status(400).json({ error: '"user" must be at least in one group' });
  } else if (typeof userType !== "string") {
    return res.status(400).json({ error: '"userType" must be a string' });
  } else if (userType.length < 1) {
    return res.status(400).json({ error: '"userType" length must be at least 1 character long' });
  }

  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));
    if (Item) {
      // Validate User Request or Admin Request
      if (Item.userId !== decodedToken.userId || !decodedToken.userGroup.includes("admin")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const params = {
        TableName: USERS_TABLE,
        Key: {
          userId: userId,
        },
        UpdateExpression:
          "set #name = :name, #mobile = :mobile, #userGroup = :userGroup, #userType = :userType",
        ExpressionAttributeNames: {
          "#name": "name",
          "#mobile": "mobile",
          "#userGroup": "userGroup",
          "#userType": "userType",
        },
        ExpressionAttributeValues: {
          ":name": name,
          ":mobile": mobile,
          ":userGroup": userGroup,
          ":userType": userType,
        },
      };

      try {
        await dynamoDbClient.send(new UpdateCommand(params));
        return res.json({ userId, name, mobile, userGroup, userType, message: "User updated successfully" });
      } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Could not update user" });
      }
    }
    return res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Could not retreive user" });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


module.exports.handler = serverless(app);
