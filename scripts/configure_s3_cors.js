const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = 'jamjam-resort-images';

const corsConfiguration = {
    CORSRules: [
        {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'], // Allow all origins for React Native
            ExposeHeaders: ['ETag', 'x-amz-server-side-encryption', 'x-amz-request-id'],
            MaxAgeSeconds: 3600,
        },
    ],
};

async function configureCORS() {
    try {
        console.log(`🔧 Configuring CORS for S3 bucket: ${BUCKET_NAME}`);

        // Check current CORS configuration
        try {
            const currentCors = await s3Client.send(new GetBucketCorsCommand({
                Bucket: BUCKET_NAME,
            }));
            console.log('📋 Current CORS configuration:');
            console.log(JSON.stringify(currentCors.CORSRules, null, 2));
        } catch (error) {
            if (error.name === 'NoSuchCORSConfiguration') {
                console.log('⚠️  No CORS configuration exists yet');
            } else {
                throw error;
            }
        }

        // Apply new CORS configuration
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: BUCKET_NAME,
            CORSConfiguration: corsConfiguration,
        }));

        console.log('✅ CORS configuration applied successfully!');
        console.log('\n📝 New CORS Rules:');
        console.log(JSON.stringify(corsConfiguration.CORSRules, null, 2));

        // Verify the new configuration
        const newCors = await s3Client.send(new GetBucketCorsCommand({
            Bucket: BUCKET_NAME,
        }));
        console.log('\n✅ Verified CORS configuration:');
        console.log(JSON.stringify(newCors.CORSRules, null, 2));

    } catch (error) {
        console.error('❌ Error configuring CORS:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

configureCORS();
