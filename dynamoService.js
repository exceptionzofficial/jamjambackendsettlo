const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
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

// S3 Client Configuration
// requestChecksumCalculation: 'WHEN_REQUIRED' prevents SDK from auto-adding
// CRC32 checksums to presigned URLs (which would cause upload failures)
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

const S3_BUCKET = 'jamjam-resort-images';

// Table Names
const TABLES = {
    CUSTOMERS: 'JamJamCustomers',
    GAMES: 'JamJamGames',
    BOOKINGS: 'JamJamBookings',
    MENU_ITEMS: 'JamJamMenuItems',
    COMBOS: 'JamJamCombos',
    RESTAURANT_ORDERS: 'JamJamRestaurantOrders',
    BAKERY_ITEMS: 'JamJamBakeryItems',
    BAKERY_ORDERS: 'JamJamBakeryOrders',
    JUICE_ITEMS: 'JamJamJuiceItems',
    JUICE_ORDERS: 'JamJamJuiceOrders',
    MASSAGE_ITEMS: 'JamJamMassageItems',
    MASSAGE_ORDERS: 'JamJamMassageOrders',
    POOL_TYPES: 'JamJamPoolTypes',
    POOL_ORDERS: 'JamJamPoolOrders',
    TAX_SETTINGS: 'JamJamTaxSettings',
    ROOMS: 'JamJamRooms',
};

// Default Menu Items
const DEFAULT_MENU_ITEMS = [
    // Veg Items
    { itemId: 'menu_1', name: 'Veg Biryani', category: 'veg', price: 150, description: 'Aromatic rice with mixed vegetables', available: true },
    { itemId: 'menu_2', name: 'Paneer Butter Masala', category: 'veg', price: 180, description: 'Paneer in rich tomato gravy', available: true },
    { itemId: 'menu_3', name: 'Dal Fry', category: 'veg', price: 120, description: 'Yellow lentils tempered with spices', available: true },
    { itemId: 'menu_4', name: 'Veg Fried Rice', category: 'veg', price: 130, description: 'Stir fried rice with vegetables', available: true },
    { itemId: 'menu_5', name: 'Jeera Rice', category: 'veg', price: 100, description: 'Basmati rice with cumin', available: true },
    { itemId: 'menu_6', name: 'Butter Naan', category: 'veg', price: 40, description: 'Soft naan brushed with butter', available: true },
    // Non-Veg Items
    { itemId: 'menu_7', name: 'Chicken Biryani', category: 'non-veg', price: 200, description: 'Hyderabadi style chicken biryani', available: true },
    { itemId: 'menu_8', name: 'Butter Chicken', category: 'non-veg', price: 220, description: 'Creamy tomato chicken curry', available: true },
    { itemId: 'menu_9', name: 'Mutton Curry', category: 'non-veg', price: 280, description: 'Spicy mutton in rich gravy', available: true },
    { itemId: 'menu_10', name: 'Fish Fry', category: 'non-veg', price: 180, description: 'Crispy fried fish', available: true },
    { itemId: 'menu_11', name: 'Egg Curry', category: 'non-veg', price: 140, description: 'Eggs in spiced onion gravy', available: true },
    { itemId: 'menu_12', name: 'Chicken Fried Rice', category: 'non-veg', price: 160, description: 'Stir fried rice with chicken', available: true },
    // Drinks
    { itemId: 'menu_13', name: 'Coca Cola', category: 'drinks', price: 40, description: '300ml bottle', available: true },
    { itemId: 'menu_14', name: 'Sprite', category: 'drinks', price: 40, description: '300ml bottle', available: true },
    { itemId: 'menu_15', name: 'Mango Lassi', category: 'drinks', price: 60, description: 'Sweet mango yogurt drink', available: true },
    { itemId: 'menu_16', name: 'Fresh Lime Soda', category: 'drinks', price: 50, description: 'Refreshing lime soda', available: true },
    { itemId: 'menu_17', name: 'Mineral Water', category: 'drinks', price: 20, description: '500ml bottle', available: true },
    // Desserts
    { itemId: 'menu_18', name: 'Gulab Jamun', category: 'desserts', price: 60, description: '2 pieces with sugar syrup', available: true },
    { itemId: 'menu_19', name: 'Ice Cream', category: 'desserts', price: 80, description: 'Vanilla/Chocolate/Strawberry', available: true },
    { itemId: 'menu_20', name: 'Kheer', category: 'desserts', price: 70, description: 'Rice pudding with nuts', available: true },
];

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

// Default Rooms Data
const DEFAULT_ROOMS = [
    { roomId: 'room_1', name: 'Semi Suite Hut', tamilName: 'குறிஞ்சி இல்லம்', price: 4000, size: '256 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_2', name: 'Semi Suite Hut', tamilName: 'முல்லை இல்லம்', price: 4200, size: '260 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_3', name: 'Semi Suite Hut', tamilName: 'மருதம் இல்லம்', price: 3800, size: '250 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_4', name: 'Semi Suite Hut', tamilName: 'நெய்தல் இல்லம்', price: 4500, size: '280 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_5', name: 'Semi Suite Hut', tamilName: 'பாலை இல்லம்', price: 4000, size: '256 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_6', name: 'Luxury Suite', tamilName: 'தாமரை இல்லம்', price: 5500, size: '350 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_7', name: 'Luxury Suite', tamilName: 'மல்லிகை இல்லம்', price: 5500, size: '350 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_8', name: 'Premium Hut', tamilName: 'ரோஜா இல்லம்', price: 4800, size: '300 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_9', name: 'Premium Hut', tamilName: 'லில்லி இல்லம்', price: 4800, size: '300 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_10', name: 'Standard Room', tamilName: 'செம்பருத்தி இல்லம்', price: 3500, size: '220 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_11', name: 'Standard Room', tamilName: 'டெய்சி இல்லம்', price: 3500, size: '220 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_12', name: 'Family Suite', tamilName: 'சூரியகாந்தி இல்லம்', price: 6000, size: '450 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
    { roomId: 'room_13', name: 'Executive Room', tamilName: 'ஆர்க்கிட் இல்லம்', price: 5200, size: '320 SQ.FT', facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'], ac: true, imageUrl: '', descriptions: [], subImages: [] },
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

    // 4. Menu Items Table
    if (!(await tableExists(TABLES.MENU_ITEMS))) {
        console.log(`📦 Creating table: ${TABLES.MENU_ITEMS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.MENU_ITEMS,
            KeySchema: [
                { AttributeName: 'itemId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'itemId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.MENU_ITEMS);

        // Initialize with default menu items
        console.log('📝 Inserting default menu items...');
        for (const item of DEFAULT_MENU_ITEMS) {
            await docClient.send(new PutCommand({
                TableName: TABLES.MENU_ITEMS,
                Item: item,
            }));
        }
        console.log(`✓ Inserted ${DEFAULT_MENU_ITEMS.length} default menu items`);
    } else {
        console.log(`✓ Table ${TABLES.MENU_ITEMS} already exists`);
    }

    // 5. Combos Table
    if (!(await tableExists(TABLES.COMBOS))) {
        console.log(`📦 Creating table: ${TABLES.COMBOS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.COMBOS,
            KeySchema: [
                { AttributeName: 'comboId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'comboId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.COMBOS);
    } else {
        console.log(`✓ Table ${TABLES.COMBOS} already exists`);
    }

    // 6. Restaurant Orders Table
    if (!(await tableExists(TABLES.RESTAURANT_ORDERS))) {
        console.log(`📦 Creating table: ${TABLES.RESTAURANT_ORDERS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.RESTAURANT_ORDERS,
            KeySchema: [
                { AttributeName: 'orderId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'orderId', AttributeType: 'S' },
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
        await waitForTable(TABLES.RESTAURANT_ORDERS);
    } else {
        console.log(`✓ Table ${TABLES.RESTAURANT_ORDERS} already exists`);
    }

    // Bakery Items Table
    if (!(await tableExists(TABLES.BAKERY_ITEMS))) {
        console.log(`Creating table: ${TABLES.BAKERY_ITEMS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.BAKERY_ITEMS,
            KeySchema: [
                { AttributeName: 'itemId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'itemId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.BAKERY_ITEMS);
    } else {
        console.log(`✓ Table ${TABLES.BAKERY_ITEMS} already exists`);
    }

    // Bakery Orders Table
    if (!(await tableExists(TABLES.BAKERY_ORDERS))) {
        console.log(`Creating table: ${TABLES.BAKERY_ORDERS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.BAKERY_ORDERS,
            KeySchema: [
                { AttributeName: 'orderId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'orderId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.BAKERY_ORDERS);
    } else {
        console.log(`✓ Table ${TABLES.BAKERY_ORDERS} already exists`);
    }

    // Juice Items Table
    if (!(await tableExists(TABLES.JUICE_ITEMS))) {
        console.log(`Creating table: ${TABLES.JUICE_ITEMS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.JUICE_ITEMS,
            KeySchema: [
                { AttributeName: 'itemId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'itemId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.JUICE_ITEMS);
    } else {
        console.log(`✓ Table ${TABLES.JUICE_ITEMS} already exists`);
    }

    // Juice Orders Table
    if (!(await tableExists(TABLES.JUICE_ORDERS))) {
        console.log(`Creating table: ${TABLES.JUICE_ORDERS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.JUICE_ORDERS,
            KeySchema: [
                { AttributeName: 'orderId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'orderId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.JUICE_ORDERS);
    } else {
        console.log(`✓ Table ${TABLES.JUICE_ORDERS} already exists`);
    }

    // Massage Items Table
    if (!(await tableExists(TABLES.MASSAGE_ITEMS))) {
        console.log(`Creating table: ${TABLES.MASSAGE_ITEMS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.MASSAGE_ITEMS,
            KeySchema: [
                { AttributeName: 'itemId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'itemId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.MASSAGE_ITEMS);
    } else {
        console.log(`✓ Table ${TABLES.MASSAGE_ITEMS} already exists`);
    }

    // Massage Orders Table
    if (!(await tableExists(TABLES.MASSAGE_ORDERS))) {
        console.log(`Creating table: ${TABLES.MASSAGE_ORDERS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.MASSAGE_ORDERS,
            KeySchema: [
                { AttributeName: 'orderId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'orderId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.MASSAGE_ORDERS);
    } else {
        console.log(`✓ Table ${TABLES.MASSAGE_ORDERS} already exists`);
    }

    // Pool Types Table
    if (!(await tableExists(TABLES.POOL_TYPES))) {
        console.log(`Creating table: ${TABLES.POOL_TYPES}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.POOL_TYPES,
            KeySchema: [
                { AttributeName: 'typeId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'typeId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.POOL_TYPES);

        // Initialize with default pool types
        console.log('📝 Inserting default pool types...');
        const defaultPoolTypes = [
            { typeId: 'pool_type_1', name: 'Kids Pool', description: 'For children aged 4-12 years', ageRange: '4-12', price: 150, icon: 'human-child' },
            { typeId: 'pool_type_2', name: 'Adults Pool', description: 'For ages 12 and above', ageRange: '12+', price: 200, icon: 'swim' },
        ];
        for (const poolType of defaultPoolTypes) {
            await docClient.send(new PutCommand({
                TableName: TABLES.POOL_TYPES,
                Item: { ...poolType, createdAt: new Date().toISOString() },
            }));
        }
        console.log('✓ Inserted 2 default pool types');
    } else {
        console.log(`✓ Table ${TABLES.POOL_TYPES} already exists`);
    }

    // Pool Orders Table
    if (!(await tableExists(TABLES.POOL_ORDERS))) {
        console.log(`Creating table: ${TABLES.POOL_ORDERS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.POOL_ORDERS,
            KeySchema: [
                { AttributeName: 'orderId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'orderId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.POOL_ORDERS);
    } else {
        console.log(`✓ Table ${TABLES.POOL_ORDERS} already exists`);
    }

    // Tax Settings Table
    if (!(await tableExists(TABLES.TAX_SETTINGS))) {
        console.log(`Creating table: ${TABLES.TAX_SETTINGS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.TAX_SETTINGS,
            KeySchema: [
                { AttributeName: 'serviceId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'serviceId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.TAX_SETTINGS);

        // Initialize with default tax rates
        console.log('📝 Inserting default tax settings...');
        const defaultTaxSettings = [
            { serviceId: 'games', serviceName: 'Games', taxPercent: 0, description: 'Game Zone' },
            { serviceId: 'restaurant', serviceName: 'Restaurant', taxPercent: 5, description: 'Food & Dining' },
            { serviceId: 'bakery', serviceName: 'Bakery', taxPercent: 5, description: 'Bakery Items' },
            { serviceId: 'juice', serviceName: 'Juice Bar', taxPercent: 5, description: 'Fresh Juices' },
            { serviceId: 'massage', serviceName: 'Massage', taxPercent: 18, description: 'Spa & Massage' },
            { serviceId: 'pool', serviceName: 'Pool', taxPercent: 18, description: 'Swimming Pool' },
        ];
        for (const setting of defaultTaxSettings) {
            await docClient.send(new PutCommand({
                TableName: TABLES.TAX_SETTINGS,
                Item: { ...setting, updatedAt: new Date().toISOString() },
            }));
        }
        console.log('✓ Inserted 6 default tax settings');
    } else {
        console.log(`✓ Table ${TABLES.TAX_SETTINGS} already exists`);
    }

    // 15. Rooms Table
    if (!(await tableExists(TABLES.ROOMS))) {
        console.log(`📦 Creating table: ${TABLES.ROOMS}`);
        await client.send(new CreateTableCommand({
            TableName: TABLES.ROOMS,
            KeySchema: [
                { AttributeName: 'roomId', KeyType: 'HASH' },
            ],
            AttributeDefinitions: [
                { AttributeName: 'roomId', AttributeType: 'S' },
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        }));
        await waitForTable(TABLES.ROOMS);

        // Initialize with default rooms
        console.log('📝 Inserting default rooms...');
        for (const room of DEFAULT_ROOMS) {
            await docClient.send(new PutCommand({
                TableName: TABLES.ROOMS,
                Item: { ...room, createdAt: new Date().toISOString() },
            }));
        }
        console.log(`✓ Inserted ${DEFAULT_ROOMS.length} default rooms`);
    } else {
        console.log(`✓ Table ${TABLES.ROOMS} already exists`);
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
    // DynamoDB contains is case-sensitive, so fetch all and filter locally for better UX
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.CUSTOMERS,
    }));
    const customers = response.Items || [];
    const lowerQuery = query.toLowerCase();

    return customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(lowerQuery)) ||
        (c.mobile && c.mobile.includes(query))
    );
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

// ============= MENU ITEM OPERATIONS =============

const createMenuItem = async (item) => {
    const menuItem = {
        ...item,
        createdAt: new Date().toISOString(),
        available: item.available !== false,
    };
    await docClient.send(new PutCommand({
        TableName: TABLES.MENU_ITEMS,
        Item: menuItem,
    }));
    return menuItem;
};

const getMenuItemById = async (itemId) => {
    const response = await docClient.send(new GetCommand({
        TableName: TABLES.MENU_ITEMS,
        Key: { itemId },
    }));
    return response.Item;
};

const getAllMenuItems = async () => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.MENU_ITEMS,
    }));
    return response.Items || [];
};

const updateMenuItem = async (itemId, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
        updateExpressions.push(`#attr${index} = :val${index}`);
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = updates[key];
    });

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.MENU_ITEMS,
        Key: { itemId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const deleteMenuItem = async (itemId) => {
    await docClient.send(new DeleteCommand({
        TableName: TABLES.MENU_ITEMS,
        Key: { itemId },
    }));
};

// ============= COMBO OPERATIONS =============

const createCombo = async (combo) => {
    const comboItem = {
        ...combo,
        createdAt: new Date().toISOString(),
        active: combo.active !== false,
    };
    await docClient.send(new PutCommand({
        TableName: TABLES.COMBOS,
        Item: comboItem,
    }));
    return comboItem;
};

const getComboById = async (comboId) => {
    const response = await docClient.send(new GetCommand({
        TableName: TABLES.COMBOS,
        Key: { comboId },
    }));
    return response.Item;
};

const getAllCombos = async () => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.COMBOS,
    }));
    return response.Items || [];
};

const updateCombo = async (comboId, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
        updateExpressions.push(`#attr${index} = :val${index}`);
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = updates[key];
    });

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.COMBOS,
        Key: { comboId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const deleteCombo = async (comboId) => {
    await docClient.send(new DeleteCommand({
        TableName: TABLES.COMBOS,
        Key: { comboId },
    }));
};

// ============= RESTAURANT ORDER OPERATIONS =============

const createRestaurantOrder = async (order) => {
    const orderItem = {
        ...order,
        timestamp: new Date().toISOString(),
        status: order.status || 'pending', // pending, preparing, ready, served
    };
    await docClient.send(new PutCommand({
        TableName: TABLES.RESTAURANT_ORDERS,
        Item: orderItem,
    }));
    return orderItem;
};

const getRestaurantOrderById = async (orderId) => {
    const response = await docClient.send(new GetCommand({
        TableName: TABLES.RESTAURANT_ORDERS,
        Key: { orderId },
    }));
    return response.Item;
};

const getAllRestaurantOrders = async () => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.RESTAURANT_ORDERS,
    }));
    // Sort by timestamp descending
    return (response.Items || []).sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );
};

const getCustomerRestaurantOrders = async (customerId) => {
    const response = await docClient.send(new QueryCommand({
        TableName: TABLES.RESTAURANT_ORDERS,
        IndexName: 'customerId-timestamp-index',
        KeyConditionExpression: 'customerId = :customerId',
        ExpressionAttributeValues: { ':customerId': customerId },
        ScanIndexForward: false,
    }));
    return response.Items || [];
};

const updateRestaurantOrderStatus = async (orderId, status) => {
    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.RESTAURANT_ORDERS,
        Key: { orderId },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const updateRestaurantOrderPayment = async (orderId, paymentMethod) => {
    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.RESTAURANT_ORDERS,
        Key: { orderId },
        UpdateExpression: 'SET paymentMethod = :paymentMethod',
        ExpressionAttributeValues: { ':paymentMethod': paymentMethod },
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

// ============= BAKERY ITEM OPERATIONS =============

const createBakeryItem = async (item) => {
    const now = new Date().toISOString();
    const newItem = {
        ...item,
        createdAt: now,
        updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.BAKERY_ITEMS, Item: newItem }));
    return newItem;
};

const getBakeryItemById = async (itemId) => {
    const response = await docClient.send(new GetCommand({ TableName: TABLES.BAKERY_ITEMS, Key: { itemId } }));
    return response.Item;
};

const getAllBakeryItems = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.BAKERY_ITEMS }));
    return response.Items || [];
};

const updateBakeryItem = async (itemId, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
    });

    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.BAKERY_ITEMS,
        Key: { itemId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const deleteBakeryItem = async (itemId) => {
    await docClient.send(new DeleteCommand({ TableName: TABLES.BAKERY_ITEMS, Key: { itemId } }));
    return { deleted: true, itemId };
};

// ============= BAKERY ORDER OPERATIONS =============

const createBakeryOrder = async (order) => {
    const now = new Date().toISOString();
    const newOrder = {
        ...order,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.BAKERY_ORDERS, Item: newOrder }));
    return newOrder;
};

const getAllBakeryOrders = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.BAKERY_ORDERS }));
    return (response.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getCustomerBakeryOrders = async (customerId) => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.BAKERY_ORDERS,
        FilterExpression: 'customerId = :customerId',
        ExpressionAttributeValues: { ':customerId': customerId },
    }));
    return (response.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ============= JUICE ITEM OPERATIONS =============

const createJuiceItem = async (item) => {
    const now = new Date().toISOString();
    const newItem = {
        ...item,
        createdAt: now,
        updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.JUICE_ITEMS, Item: newItem }));
    return newItem;
};

const getJuiceItemById = async (itemId) => {
    const response = await docClient.send(new GetCommand({ TableName: TABLES.JUICE_ITEMS, Key: { itemId } }));
    return response.Item;
};

const getAllJuiceItems = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.JUICE_ITEMS }));
    return response.Items || [];
};

const updateJuiceItem = async (itemId, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
    });

    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.JUICE_ITEMS,
        Key: { itemId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const deleteJuiceItem = async (itemId) => {
    await docClient.send(new DeleteCommand({ TableName: TABLES.JUICE_ITEMS, Key: { itemId } }));
    return { deleted: true, itemId };
};

// ============= JUICE ORDER OPERATIONS =============

const createJuiceOrder = async (order) => {
    const now = new Date().toISOString();
    const newOrder = {
        ...order,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.JUICE_ORDERS, Item: newOrder }));
    return newOrder;
};

const getAllJuiceOrders = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.JUICE_ORDERS }));
    return (response.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getCustomerJuiceOrders = async (customerId) => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.JUICE_ORDERS,
        FilterExpression: 'customerId = :customerId',
        ExpressionAttributeValues: { ':customerId': customerId },
    }));
    return (response.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ============= MASSAGE ITEM OPERATIONS =============

const createMassageItem = async (item) => {
    const now = new Date().toISOString();
    const newItem = {
        ...item,
        createdAt: now,
        updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.MASSAGE_ITEMS, Item: newItem }));
    return newItem;
};

const getMassageItemById = async (itemId) => {
    const response = await docClient.send(new GetCommand({ TableName: TABLES.MASSAGE_ITEMS, Key: { itemId } }));
    return response.Item;
};

const getAllMassageItems = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.MASSAGE_ITEMS }));
    return response.Items || [];
};

const updateMassageItem = async (itemId, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
    });

    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.MASSAGE_ITEMS,
        Key: { itemId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const deleteMassageItem = async (itemId) => {
    await docClient.send(new DeleteCommand({ TableName: TABLES.MASSAGE_ITEMS, Key: { itemId } }));
    return { deleted: true, itemId };
};

// ============= MASSAGE ORDER OPERATIONS =============

const createMassageOrder = async (order) => {
    const now = new Date().toISOString();
    const newOrder = {
        ...order,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.MASSAGE_ORDERS, Item: newOrder }));
    return newOrder;
};

const getAllMassageOrders = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.MASSAGE_ORDERS }));
    return (response.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getCustomerMassageOrders = async (customerId) => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.MASSAGE_ORDERS,
        FilterExpression: 'customerId = :customerId',
        ExpressionAttributeValues: { ':customerId': customerId },
    }));
    return (response.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ============= POOL TYPE OPERATIONS =============

const createPoolType = async (item) => {
    const now = new Date().toISOString();
    const newItem = {
        ...item,
        createdAt: now,
        updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.POOL_TYPES, Item: newItem }));
    return newItem;
};

const getAllPoolTypes = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.POOL_TYPES }));
    return response.Items || [];
};

const updatePoolType = async (typeId, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
    });

    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.POOL_TYPES,
        Key: { typeId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

const deletePoolType = async (typeId) => {
    await docClient.send(new DeleteCommand({ TableName: TABLES.POOL_TYPES, Key: { typeId } }));
    return { deleted: true, typeId };
};

// ============= POOL ORDER OPERATIONS =============

const createPoolOrder = async (order) => {
    const now = new Date().toISOString();
    const newOrder = {
        ...order,
        status: 'confirmed',
        timestamp: now,
        createdAt: now,
        updatedAt: now,
    };
    await docClient.send(new PutCommand({ TableName: TABLES.POOL_ORDERS, Item: newOrder }));
    return newOrder;
};

const getAllPoolOrders = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.POOL_ORDERS }));
    return (response.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getCustomerPoolOrders = async (customerId) => {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.POOL_ORDERS,
        FilterExpression: 'customerId = :customerId',
        ExpressionAttributeValues: { ':customerId': customerId },
    }));
    return (response.Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ============= TAX SETTINGS OPERATIONS =============

const getAllTaxSettings = async () => {
    const response = await docClient.send(new ScanCommand({ TableName: TABLES.TAX_SETTINGS }));
    return response.Items || [];
};

const getTaxSettingByService = async (serviceId) => {
    const response = await docClient.send(new GetCommand({
        TableName: TABLES.TAX_SETTINGS,
        Key: { serviceId },
    }));
    return response.Item;
};

const updateTaxSetting = async (serviceId, taxPercent) => {
    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.TAX_SETTINGS,
        Key: { serviceId },
        UpdateExpression: 'SET taxPercent = :taxPercent, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
            ':taxPercent': taxPercent,
            ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
};

// ============= ADMIN ANALYTICS OPERATIONS =============

const getAdminDashboardStats = async () => {
    // Fetch all orders from all services
    const [
        bookings,
        restaurantOrders,
        bakeryOrders,
        juiceOrders,
        massageOrders,
        poolOrders,
    ] = await Promise.all([
        docClient.send(new ScanCommand({ TableName: TABLES.BOOKINGS })),
        docClient.send(new ScanCommand({ TableName: TABLES.RESTAURANT_ORDERS })),
        docClient.send(new ScanCommand({ TableName: TABLES.BAKERY_ORDERS })),
        docClient.send(new ScanCommand({ TableName: TABLES.JUICE_ORDERS })),
        docClient.send(new ScanCommand({ TableName: TABLES.MASSAGE_ORDERS })),
        docClient.send(new ScanCommand({ TableName: TABLES.POOL_ORDERS })),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    const allOrders = [
        ...(bookings.Items || []).map(o => ({ ...o, service: o.service || 'Games', amount: o.totalAmount || 0, createdAt: o.createdAt || o.timestamp })),
        ...(restaurantOrders.Items || []).map(o => ({ ...o, service: 'Restaurant', amount: o.totalAmount || 0, createdAt: o.createdAt || o.timestamp })),
        ...(bakeryOrders.Items || []).map(o => ({ ...o, service: 'Bakery', amount: o.totalAmount || 0, createdAt: o.createdAt || o.timestamp })),
        ...(juiceOrders.Items || []).map(o => ({ ...o, service: 'Juice', amount: o.totalAmount || 0, createdAt: o.createdAt || o.timestamp })),
        ...(massageOrders.Items || []).map(o => ({ ...o, service: 'Massage', amount: o.totalAmount || 0, createdAt: o.createdAt || o.timestamp })),
        ...(poolOrders.Items || []).map(o => ({ ...o, service: 'Pool', amount: o.totalAmount || 0, createdAt: o.createdAt || o.timestamp })),
    ];

    const calculateRevenue = (orders, startDate) => {
        return orders
            .filter(o => o.createdAt >= startDate)
            .reduce((sum, o) => sum + (o.amount || 0), 0);
    };

    const calculateByService = (orders, startDate) => {
        const filtered = orders.filter(o => o.createdAt >= startDate);
        const byService = {};
        filtered.forEach(o => {
            byService[o.service] = (byService[o.service] || 0) + (o.amount || 0);
        });
        return byService;
    };

    return {
        today: {
            revenue: calculateRevenue(allOrders, todayStart),
            orderCount: allOrders.filter(o => o.createdAt >= todayStart).length,
            byService: calculateByService(allOrders, todayStart),
        },
        week: {
            revenue: calculateRevenue(allOrders, weekStart),
            orderCount: allOrders.filter(o => o.createdAt >= weekStart).length,
            byService: calculateByService(allOrders, weekStart),
        },
        month: {
            revenue: calculateRevenue(allOrders, monthStart),
            orderCount: allOrders.filter(o => o.createdAt >= monthStart).length,
            byService: calculateByService(allOrders, monthStart),
        },
        year: {
            revenue: calculateRevenue(allOrders, yearStart),
            orderCount: allOrders.filter(o => o.createdAt >= yearStart).length,
            byService: calculateByService(allOrders, yearStart),
        },
        totalOrders: allOrders.length,
    };
};

const getAllOrdersForAdmin = async (startDate, endDate) => {
    // Fetch all orders from all services
    const [
        bookings,
        restaurantOrders,
        bakeryOrders,
        juiceOrders,
        massageOrders,
        poolOrders,
    ] = await Promise.all([
        docClient.send(new ScanCommand({ TableName: TABLES.BOOKINGS })),
        docClient.send(new ScanCommand({ TableName: TABLES.RESTAURANT_ORDERS })),
        docClient.send(new ScanCommand({ TableName: TABLES.BAKERY_ORDERS })),
        docClient.send(new ScanCommand({ TableName: TABLES.JUICE_ORDERS })),
        docClient.send(new ScanCommand({ TableName: TABLES.MASSAGE_ORDERS })),
        docClient.send(new ScanCommand({ TableName: TABLES.POOL_ORDERS })),
    ]);

    let allOrders = [
        ...(bookings.Items || []).map(o => ({ ...o, service: o.service || 'Games', orderId: o.bookingId, createdAt: o.createdAt || o.timestamp })),
        ...(restaurantOrders.Items || []).map(o => ({ ...o, service: 'Restaurant', createdAt: o.createdAt || o.timestamp })),
        ...(bakeryOrders.Items || []).map(o => ({ ...o, service: 'Bakery', createdAt: o.createdAt || o.timestamp })),
        ...(juiceOrders.Items || []).map(o => ({ ...o, service: 'Juice', createdAt: o.createdAt || o.timestamp })),
        ...(massageOrders.Items || []).map(o => ({ ...o, service: 'Massage', createdAt: o.createdAt || o.timestamp })),
        ...(poolOrders.Items || []).map(o => ({ ...o, service: 'Pool', createdAt: o.createdAt || o.timestamp })),
    ];

    // Filter by date range if provided
    if (startDate) {
        allOrders = allOrders.filter(o => o.createdAt >= startDate);
    }
    if (endDate) {
        allOrders = allOrders.filter(o => o.createdAt <= endDate);
    }

    // Sort by date descending
    return allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    // Menu Items
    createMenuItem,
    getMenuItemById,
    getAllMenuItems,
    updateMenuItem,
    deleteMenuItem,
    // Combos
    createCombo,
    getComboById,
    getAllCombos,
    updateCombo,
    deleteCombo,
    // Restaurant Orders
    createRestaurantOrder,
    getRestaurantOrderById,
    getAllRestaurantOrders,
    getCustomerRestaurantOrders,
    updateRestaurantOrderStatus,
    updateRestaurantOrderPayment,
    // Bakery Items
    createBakeryItem,
    getBakeryItemById,
    getAllBakeryItems,
    updateBakeryItem,
    deleteBakeryItem,
    // Bakery Orders
    createBakeryOrder,
    getAllBakeryOrders,
    getCustomerBakeryOrders,
    // Juice Items
    createJuiceItem,
    getJuiceItemById,
    getAllJuiceItems,
    updateJuiceItem,
    deleteJuiceItem,
    // Juice Orders
    createJuiceOrder,
    getAllJuiceOrders,
    getCustomerJuiceOrders,
    // Massage Items
    createMassageItem,
    getMassageItemById,
    getAllMassageItems,
    updateMassageItem,
    deleteMassageItem,
    // Massage Orders
    createMassageOrder,
    getAllMassageOrders,
    getCustomerMassageOrders,
    // Pool Types
    createPoolType,
    getAllPoolTypes,
    updatePoolType,
    deletePoolType,
    // Pool Orders
    createPoolOrder,
    getAllPoolOrders,
    getCustomerPoolOrders,
    // Tax Settings
    getAllTaxSettings,
    getTaxSettingByService,
    updateTaxSetting,
    // Admin Analytics
    getAdminDashboardStats,
    getAllOrdersForAdmin,
    // Rooms
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    initializeDefaultRooms,
    getRoomUploadUrl,
    uploadRoomImage,
};

// ============= ROOM OPERATIONS =============

async function getAllRooms() {
    const response = await docClient.send(new ScanCommand({
        TableName: TABLES.ROOMS,
    }));
    return response.Items || [];
}

async function getRoomById(roomId) {
    const response = await docClient.send(new GetCommand({
        TableName: TABLES.ROOMS,
        Key: { roomId },
    }));
    return response.Item;
}

async function createRoom(room) {
    const item = {
        ...room,
        roomId: room.roomId || `room_${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({
        TableName: TABLES.ROOMS,
        Item: item,
    }));
    return item;
}

async function updateRoom(roomId, updates) {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
        updateExpressions.push(`#attr${index} = :val${index}`);
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = updates[key];
    });

    const response = await docClient.send(new UpdateCommand({
        TableName: TABLES.ROOMS,
        Key: { roomId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
    }));
    return response.Attributes;
}

async function deleteRoom(roomId) {
    await docClient.send(new DeleteCommand({
        TableName: TABLES.ROOMS,
        Key: { roomId },
    }));
}

async function initializeDefaultRooms() {
    console.log('📝 Initializing default rooms...');
    for (const room of DEFAULT_ROOMS) {
        await docClient.send(new PutCommand({
            TableName: TABLES.ROOMS,
            Item: { ...room, createdAt: new Date().toISOString() },
        }));
    }
    return DEFAULT_ROOMS;
}

async function getRoomUploadUrl(fileName, fileType) {
    const key = `rooms/${Date.now()}_${fileName}`;
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    // Normal S3 public URL
    const publicUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return { uploadUrl, publicUrl };
}

async function uploadRoomImage(base64Data, fileName, fileType = 'image/jpeg') {
    const key = `rooms/${Date.now()}_${fileName}`;

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload directly to S3
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: fileType,
    });

    await s3Client.send(command);

    const publicUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return { publicUrl };
}
