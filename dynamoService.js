const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

// DynamoDB Client Configuration
const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const docClient = DynamoDBDocumentClient.from(client);

// Table Names
const TABLES = {
    CUSTOMERS: 'JamJamCustomers',
    GAMES: 'JamJamGames',
    BOOKINGS: 'JamJamBookings',
};

// Default Games Data
const DEFAULT_GAMES = [
    { gameId: 'game_1', name: 'Car Dancing', coins: '1', minutes: 3, rate: 30 },
    { gameId: 'game_2', name: 'Horse Riding', coins: '1', minutes: 3, rate: 30 },
    { gameId: 'game_3', name: 'Elephant Riding', coins: '1', minutes: 3, rate: 30 },
    { gameId: 'game_4', name: 'Frog Hitter', coins: '1', minutes: 3, rate: 30 },
    { gameId: 'game_5', name: 'Ball Shooter', coins: '1', minutes: 3, rate: 30 },
    { gameId: 'game_6', name: 'Car Racing', coins: '2', minutes: 3, rate: 60 },
    { gameId: 'game_7', name: 'Dancing Roll', coins: '1', minutes: 3, rate: 30 },
    { gameId: 'game_8', name: 'Bike Racing', coins: '2', minutes: 3, rate: 60 },
    { gameId: 'game_9', name: 'Basket Ball', coins: '1', minutes: 1.5, rate: 30 },
    { gameId: 'game_10', name: 'Gun Shooter', coins: '2', minutes: 3, rate: 40 },
    { gameId: 'game_11', name: 'Bull Rider (18+)', coins: 'Ticket', minutes: 5, rate: 50 },
    { gameId: 'game_12', name: 'Table Striker', coins: '-', minutes: 3, rate: 100 },
    { gameId: 'game_13', name: 'VR Game (18+)', coins: '-', minutes: 15, rate: 100 },
    { gameId: 'game_14', name: 'PS-4', coins: '-', minutes: 30, rate: 200 },
];

// Check if table exists
const tableExists = async (tableName) => {
    try {
        await client.send(new DescribeTableCommand({ TableName: tableName }));
        return true;
    } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
            return false;
        }
        throw error;
    }
};

// Wait for table to be active
const waitForTable = async (tableName) => {
    let attempts = 0;
    while (attempts < 30) {
        try {
            const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
            if (response.Table.TableStatus === 'ACTIVE') {
                console.log(`✓ Table ${tableName} is now ACTIVE`);
                return true;
            }
        } catch (error) {
            // Table not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
    }
    throw new Error(`Table ${tableName} did not become active`);
};

// Create Tables
const createTables = async () => {
    console.log('🚀 Initializing DynamoDB Tables...\n');

    // 1. Customers Table
    if (!(await tableExists(TABLES.CUSTOMERS))) {
        console.log(`📦 Creating table: ${TABLES.CUSTOMERS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.CUSTOMERS,
            KeySchema: [
                { AttributeName: 'customerId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'customerId', AttributeType: 'S' },
                { AttributeName: 'mobile', AttributeType: 'S' },
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'mobile-index',
                    KeySchema: [
                        { AttributeName: 'mobile', KeyType: 'HASH' },
                    ],
                    Projection: { ProjectionType: 'ALL' },
                    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
                },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.CUSTOMERS);
    } else {
        console.log(`✓ Table ${TABLES.CUSTOMERS} already exists`);
    }

    // 2. Games Table
    if (!(await tableExists(TABLES.GAMES))) {
        console.log(`📦 Creating table: ${TABLES.GAMES}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.GAMES,
            KeySchema: [
                { AttributeName: 'gameId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'gameId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.GAMES);

        // Initialize with default games
        console.log('📝 Inserting default games...');
        for (const game of DEFAULT_GAMES) {
            await docClient.send(new PutCommand({
                TableName: TABLES.GAMES,
                Item: game,
            }));
        }
        console.log(`✓ Inserted ${DEFAULT_GAMES.length} default games`);
    } else {
        console.log(`✓ Table ${TABLES.GAMES} already exists`);
    }

    // 3. Bookings Table
    if (!(await tableExists(TABLES.BOOKINGS))) {
        console.log(`📦 Creating table: ${TABLES.BOOKINGS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.BOOKINGS,
            KeySchema: [
                { AttributeName: 'bookingId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'bookingId', AttributeType: 'S' },
                { AttributeName: 'customerId', AttributeType: 'S' },
                { AttributeName: 'timestamp', AttributeType: 'S' },
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'customerId-timestamp-index',
                    KeySchema: [
                        { AttributeName: 'customerId', KeyType: 'HASH' },
                        { AttributeName: 'timestamp', KeyType: 'RANGE' },
                    ],
                    Projection: { ProjectionType: 'ALL' },
                    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
                },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.BOOKINGS);
    } else {
        console.log(`✓ Table ${TABLES.BOOKINGS} already exists`);
    }

    console.log('\n✅ All tables ready!');
};

// ============= CUSTOMER OPERATIONS =============

const createCustomer = async (customer) => {
    const item = {
        ...customer,
        createdAt: new Date().toISOString(),
        status: customer.status || 'checked-in',
    };
    await docClient.send(new PutCommand({
        TableName: TABLES.CUSTOMERS,
        Item: item,
    }));
    return item;
};

const getCustomerById = async (customerId) => {
    const response = await docClient.send(new GetCommand({
        TableName: TABLES.CUSTOMERS,
        Key: { customerId },
    }));
    return response.Item;
};

const getCustomerByMobile = async (mobile) => {
    const response = await docClient.send(new QueryCommand({
        TableName: TABLES.CUSTOMERS,
        IndexName: 'mobile-index',
        KeyConditionExpression: 'mobile = :mobile',
        ExpressionAttributeValues: { ':mobile': mobile },
    }));
    return response.Items?.[0];
};

const getAllCustomers = async () => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.CUSTOMERS,
    }));
    return response.Items || [];
};

const searchCustomers = async (query) => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.CUSTOMERS,
        FilterExpression: 'contains(#name, :query) OR contains(mobile, :query)',
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: { ':query': query },
    }));
    return response.Items || [];
};

const updateCustomer = async (customerId, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
        updateExpressions.push(`#attr${index} = :val${index}`);
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = updates[key];
    });

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.CUSTOMERS,
        Key: { customerId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const deleteCustomer = async (customerId) => {
    await docClient.send(new DeleteCommand({
        TableName: TABLES.CUSTOMERS,
        Key: { customerId },
    }));
};

// ============= GAMES OPERATIONS =============

const createGame = async (game) => {
    const item = {
        ...game,
        createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({
        TableName: TABLES.GAMES,
        Item: item,
    }));
    return item;
};

const getGameById = async (gameId) => {
    const response = await docClient.send(new GetCommand({
        TableName: TABLES.GAMES,
        Key: { gameId },
    }));
    return response.Item;
};

const getAllGames = async () => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.GAMES,
    }));
    return response.Items || [];
};

const updateGame = async (gameId, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
        updateExpressions.push(`#attr${index} = :val${index}`);
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = updates[key];
    });

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.GAMES,
        Key: { gameId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const deleteGame = async (gameId) => {
    await docClient.send(new DeleteCommand({
        TableName: TABLES.GAMES,
        Key: { gameId },
    }));
};

const initializeDefaultGames = async () => {
    for (const game of DEFAULT_GAMES) {
        await docClient.send(new PutCommand({
            TableName: TABLES.GAMES,
            Item: game,
        }));
    }
    return DEFAULT_GAMES;
};

// ============= BOOKING OPERATIONS =============

const createBooking = async (booking) => {
    const item = {
        ...booking,
        timestamp: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({
        TableName: TABLES.BOOKINGS,
        Item: item,
    }));
    return item;
};

const getBookingById = async (bookingId) => {
    const response = await docClient.send(new GetCommand({
        TableName: TABLES.BOOKINGS,
        Key: { bookingId },
    }));
    return response.Item;
};

const getAllBookings = async () => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.BOOKINGS,
    }));
    // Sort by timestamp descending
    return (response.Items || []).sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );
};

const getCustomerBookings = async (customerId) => {
    const response = await docClient.send(new QueryCommand({
        TableName: TABLES.BOOKINGS,
        IndexName: 'customerId-timestamp-index',
        KeyConditionExpression: 'customerId = :customerId',
        ExpressionAttributeValues: { ':customerId': customerId },
        ScanIndexForward: false, // Descending order (newest first)
    }));
    return response.Items || [];
};

module.exports = {
    createTables,
    TABLES,
    // Customers
    createCustomer,
    getCustomerById,
    getCustomerByMobile,
    getAllCustomers,
    searchCustomers,
    updateCustomer,
    deleteCustomer,
    // Games
    createGame,
    getGameById,
    getAllGames,
    updateGame,
    deleteGame,
    initializeDefaultGames,
    // Bookings
    createBooking,
    getBookingById,
    getAllBookings,
    getCustomerBookings,
};
