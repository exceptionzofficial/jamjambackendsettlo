const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, PutBucketCorsCommand, PutPublicAccessBlockCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const config = {
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

const dbClient = new DynamoDBClient(config);
const s3Client = new S3Client(config);

const TABLES = {
    ROOMS: 'JamJamRooms',
};

const BUCKETS = {
    IMAGES: 'jamjam-resort-images',
};

async function setupDynamoDB() {
    console.log('🚀 Setting up DynamoDB...');
    try {
        // Check if table exists
        try {
            await dbClient.send(new DescribeTableCommand({ TableName: TABLES.ROOMS }));
            console.log(`✓ Table ${TABLES.ROOMS} already exists`);
        } catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                console.log(`📦 Creating table: ${TABLES.ROOMS}`);
                await dbClient.send(new CreateTableCommand({
                    TableName: TABLES.ROOMS,
                    KeySchema: [
                        { AttributeName: 'roomId', KeyType: 'HASH' },
                    ],
                    AttributeDefinitions: [
                        { AttributeName: 'roomId', AttributeType: 'S' },
                    ],
                    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
                }));
                console.log(`✓ Table ${TABLES.ROOMS} creation initiated`);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('❌ Error setting up DynamoDB:', error.message);
    }
}

async function setupS3() {
    console.log('\n🚀 Setting up S3...');
    try {
        // Check if bucket exists
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: BUCKETS.IMAGES }));
            console.log(`✓ Bucket ${BUCKETS.IMAGES} already exists`);
        } catch (error) {
            console.log(`📦 Creating bucket: ${BUCKETS.IMAGES}`);
            await s3Client.send(new CreateBucketCommand({
                Bucket: BUCKETS.IMAGES,
                CreateBucketConfiguration: {
                    LocationConstraint: config.region,
                },
            }));
            console.log(`✓ Bucket ${BUCKETS.IMAGES} created`);
        }

        // Disable "Block Public Access" to allow public policy
        console.log(`🔧 Disabling Block Public Access for: ${BUCKETS.IMAGES}`);
        await s3Client.send(new PutPublicAccessBlockCommand({
            Bucket: BUCKETS.IMAGES,
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: false,
                IgnorePublicAcls: false,
                BlockPublicPolicy: false,
                RestrictPublicBuckets: false
            }
        }));

        // Configure CORS
        console.log(`🔧 Configuring CORS for bucket: ${BUCKETS.IMAGES}`);
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: BUCKETS.IMAGES,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
                        AllowedOrigins: ['*'],
                        ExposeHeaders: ['ETag'],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        }));
        console.log('✓ CORS configuration applied');

        // Set Public Read Policy
        console.log(`🔧 Setting public read policy for bucket: ${BUCKETS.IMAGES}`);
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Sid: 'PublicReadGetObject',
                    Effect: 'Allow',
                    Principal: '*',
                    Action: 's3:GetObject',
                    Resource: `arn:aws:s3:::${BUCKETS.IMAGES}/*`
                }
            ]
        };
        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: BUCKETS.IMAGES,
            Policy: JSON.stringify(policy)
        }));
        console.log('✓ Public read policy applied');

    } catch (error) {
        if (error.name === 'BucketAlreadyOwnedByYou') {
            console.log(`✓ Bucket ${BUCKETS.IMAGES} already owned by you`);
        } else {
            console.error('❌ Error setting up S3:', error.message);
        }
    }
}

async function run() {
    await setupDynamoDB();
    await setupS3();
    console.log('\n✅ Infrastructure setup complete!');
}

run();
