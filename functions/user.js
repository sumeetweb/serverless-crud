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

const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const client = new DynamoDBClient();
const dynamoDbClient = DynamoDBDocumentClient.from(client);

app.use(express.json());

app.post("/users/signup", async function (req, res) {
  const { userId, name, password, mobile, userGroup, userType } = req.body;

  // Validate userId 
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  }

  // Validate name
  if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  }

  // Validate password
  if (typeof password !== "string") {
    res.status(400).json({ error: '"password" must be a string' });
  } else if (password.length < 6) {
    res.status(400);
    res.json({ error: '"password" length must be 6 characters long' });
  }

  // Validate mobile
  if (typeof mobile !== "string") {
    res.status(400).json({ error: '"mobile" must be a string' });
  } else if (mobile.length < 10) {
    res.status(400);
    res.json({ error: '"mobile" length must be 10 characters long' });
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
    res.json({ userId, name });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not create user" });
  }
});


app.post("/users/login", async function (req, res) {
  const { userId, password } = req.body;

  // Validate userId
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  }

  // Validate password
  if (typeof password !== "string") {
    res.status(400).json({ error: '"password" must be a string' });
  } else if (password.length < 6) {
    res.status(400);
    res.json({ error: '"password" length must be 6 characters long' });
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
        res.json({ userId, name, token });
      }
      res.status(401).json({ error: "Passwords do not match" });
    }
    res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});


app.post("/admin/login", async function (req, res) {
  const { userId, password } = req.body;

  // Validate userId
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  }

  // Validate password
  if (typeof password !== "string") {
    res.status(400).json({ error: '"password" must be a string' });
  } else if (password.length < 6) {
    res.status(400).json({ error: '"password" length must be 6 characters long' });
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
        res.json({ userId, name, token });
      }
      res.status(401).json({ error: "Passwords do not match" });
    }
    res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});

app.post("/admin/add", async function (req, res) {
  const { userId, name, password, mobile, userGroup, userType } = req.body;

  // Validate Admin JWT Token
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
  }

  const decodedToken = authHandler.validateAdmin(token);
  if (!decodedToken) {
    res.status(401).json({ error: "Unauthorized" });
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
        res.json({ userId, name });
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not create user" });
      }
    }
    res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});

app.get("/users", async function (req, res) {
  // Validate Admin JWT Token
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
  }
  const decodedToken = authHandler.validateAdmin(token);
  if (!decodedToken) {
    res.status(401).json({ error: "Unauthorized" });
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
    res.json(Items);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive users" });
  }
});

app.get("/users/:userId", async function (req, res) {
  const { userId } = req.params;

  // Validate Admin JWT Token
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
  }

  const decodedToken = authHandler.validateAdmin(token) || authHandler.validate(token);
  if (!decodedToken) {
    res.status(401).json({ error: "Unauthorized" });
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
        res.status(401).json({ error: "Unauthorized" });
      }
      res.json(Item);
    }
    res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});

app.post("/users/:userId", async function (req, res) {
  const { userId } = req.params;
  const { name, mobile, userGroup, userType } = req.body;

  // Validate Admin JWT Token
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
  }

  const decodedToken = authHandler.validateAdmin(token) || authHandler.validate(token);
  if (!decodedToken) {
    res.status(401).json({ error: "Unauthorized" });
  }

  // Validate Req Body
  if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  } else if (name.length < 1) {
    res.status(400).json({ error: '"name" length must be at least 1 character long' });
  } else if (typeof mobile !== "string") {
    res.status(400).json({ error: '"mobile" must be a string' });
  } else if (mobile.length < 1) {
    res.status(400).json({ error: '"mobile" length must be at least 1 character long' });
  } else if (typeof userGroup !== "array") {
    res.status(400).json({ error: '"userGroup" must be a array' });
  } else if (userGroup.length < 1) {
    res.status(400).json({ error: '"user" must be at least in one group' });
  } else if (typeof userType !== "string") {
    res.status(400).json({ error: '"userType" must be a string' });
  } else if (userType.length < 1) {
    res.status(400).json({ error: '"userType" length must be at least 1 character long' });
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
        res.status(401).json({ error: "Unauthorized" });
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
        res.json({ userId, name, mobile, userGroup, userType, message: "User updated successfully" });
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not update user" });
      }
    }
    res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


module.exports.handler = serverless(app);
