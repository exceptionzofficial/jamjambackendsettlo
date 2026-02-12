const { initializeDefaultRooms } = require('../dynamoService');

async function seed() {
    console.log('🌱 Starting Room Seeding...');
    try {
        const rooms = await initializeDefaultRooms();
        console.log(`✅ successfully seeded ${rooms.length} rooms!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

seed();
