const express = require("express");
const serverless = require("serverless-http");
const app = express();

const cors = require("cors");

app.use(cors());

// Imports
const multer = require("multer");
const S3StorageEngine = require("multer-s3");
const uploadBucket = process.env.S3_BUCKET;
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = new S3Client({ region: "us-east-1" });

const AWSv2 = require("aws-sdk");

const upload = multer({
  storage: new S3StorageEngine({
    s3: s3,
    bucket: uploadBucket,
    contentType: S3StorageEngine.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, file.originalname);
    },
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    }
  }),
});

app.post("/files", upload.single("file"), async (req, res, next) => {
  // Upload Limit is 10MB in Lambda function set by AWS. Corrupt image issue is due to serverless offline and api gateway encoding issue. Check serverless.yml for more details.
  return res.status(200).json({ message: "File uploaded successfully", bodyReceived: req.body, uploadedFile: req.file.location });
});

app.get("/files/upload/:id", async (req, res, next) => {
  // Gereate a presigned URL for the file to be uploaded
  console.log("File ID: ", req.params.id);
  console.log("Bucket: ", uploadBucket);

  const paramsv2 = {
    Bucket: uploadBucket,
    Key: req.params.id,
    ContentType: "image/jpeg",
    Expires: 300 // 5 mins,
  };

  // AWS SDK v2
  // try {
  //   // Create the presigned URL.
  //   const s3v2 = new AWSv2.S3();
  //   const signedUrl = s3v2.getSignedUrl("putObject", paramsv2);
  //   console.log(signedUrl);
  //   return res.status(200).json({ PostUrl: signedUrl });
  // } catch (err) {
  //   console.log("Error: ", err);
  //   return res.status(500).json({ error: err.message });
  // }

  let paramsv3 = {
    Bucket: uploadBucket,
    Key: req.params.id,
    ContentType: "image/jpeg",
  };
  // AWS SDK v3
  try {
    // Create the command.
    let cmd = new PutObjectCommand(paramsv3);
    // Create the presigned URL.
    const signedUrl = await getSignedUrl(s3, cmd, {
      expiresIn: 300,
    });
    console.log(
      `\nGetting "${paramsv3.Key}" using signedUrl in v3`
    );
    console.log(signedUrl);
    return res.status(200).json({ PostUrl: signedUrl });
  } catch (err) {
    console.log("Error: ", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/files/:id", async (req, res, next) => {
  // Gereate a presigned URL for the file to be downloaded
  // console.log("File ID: ", req.params.id);
  // console.log("Bucket: ", uploadBucket);
  // const params = {
  //   Bucket: uploadBucket,
  //   Key: req.params.id,
  //   Expires: 60 * 60 // 1 hour
  // };

  // return await s3.send(new GetObjectCommand(params)).then((data) => {
  //   return res.status(200).send(JSON.stringify(data.Body.toString('utf-8')));
  // }).catch((err) => {
  //   console.log("Error: ", err);
  //   return res.status(500).json({ error: err.message });
  // });

  const params = {
    Bucket: uploadBucket,
    Key: req.params.id,
    Expires: 60 * 60 // 1 hour
  };

  // AWS SDK v2
  // try {
  //   // Create the presigned URL.
  //   const s3v2 = new AWSv2.S3();
  //   const signedUrl = s3v2.getSignedUrl("getObject", params);
  //   console.log(
  //     `\nGetting "${params.Key}" using signedUrl in v2`
  //   );
  //   console.log(signedUrl);
  //   return res.status(200).json({ signedUrl: signedUrl });
  // } catch (err) {
  //   console.log("Error creating presigned URL", err);
  // }

  // AWS SDK v3
  try {
    // Create the command.
    const command = new GetObjectCommand(params);
    // Create the presigned URL.
    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 3600,
    });
    console.log(
      `\nGetting "${params.Key}" using signedUrl in v3`
    );
    console.log(signedUrl);
    return res.status(200).json({ signedUrl: signedUrl });
  } catch (err) {
    console.log("Error creating presigned URL", err);
  }

});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});


module.exports.handler = serverless(app);