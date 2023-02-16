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
const authHandler = require("./utils/authHandler");

const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const ADMINS_TABLE = process.env.ADMINS_TABLE;
const client = new DynamoDBClient();
const dynamoDbClient = DynamoDBDocumentClient.from(client);

app.use(express.json());

// app.get("/users/:userId", async function (req, res) {
//   const params = {
//     TableName: USERS_TABLE,
//     Key: {
//       userId: req.params.userId,
//     },
//   };

//   try {
//     const { Item } = await dynamoDbClient.send(new GetCommand(params));
//     if (Item) {
//       const { userId, name } = Item;
//       res.json({ userId, name });
//     } else {
//       res
//         .status(404)
//         .json({ error: 'Could not find user with provided "userId"' });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Could not retreive user" });
//   }
// });


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
      } else {
        res.status(401).json({ error: "Passwords do not match" });
      }
    } else {
      res.status(404).json({ error: "User not found" });
    }
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
    TableName: ADMINS_TABLE,
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
      } else {
        res.status(401).json({ error: "Passwords do not match" });
      }
    } else {
      res.status(404).json({ error: "User not found" });
    }
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
