const { v4: uuidv4 } = require('uuid');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const multer = require('multer');
const path = require('path');
const AWS = require('aws-sdk');
require('dotenv').config();



// AWS SDK Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Create S3 instance
const s3 = new AWS.S3();

// Function to handle multipart upload
const multipartUpload = async (file, folder = 'service') => {
    try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname);
        const Key = `${folder}/${uniqueSuffix}${extension}`;

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key,
            Body: file.buffer,
            ContentType: file.mimetype,
            PartSize: 5 * 1024 * 1024, // 5MB part size
            QueueSize: 4 // Number of concurrent uploads
        };

        const upload = s3.upload(params);
        
        // Add progress tracking
        upload.on('httpUploadProgress', (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            console.log(`Upload progress: ${percentage}%`);
        });

        const result = await upload.promise();

        return {
            uniqueid: uuidv4(),
            s3Url: result.Location,
            s3Key: result.Key
        };
    } catch (error) {
        console.error('Multipart upload error:', error);
        throw error;
    }
};

const deleteImageFromS3 = async (imageKey) => {
    try {
        if (!imageKey) {
            console.error("Image key is missing");
            return;
        }

        const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: imageKey,
        };

        // console.log(`Attempting to delete image: ${imageKey}`);
        const command = new DeleteObjectCommand(deleteParams);
        const result = await s3Client.send(command);

        console.log(`Image ${imageKey} successfully deleted from S3`, result);
    } catch (error) {
        console.error(`Error deleting image ${imageKey} from S3:`, error);
        throw new Error(`Failed to delete image ${imageKey} from S3`);
    }
};

module.exports = { s3Client, deleteImageFromS3, s3, multipartUpload };



