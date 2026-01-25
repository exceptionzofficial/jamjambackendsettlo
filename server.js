const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const {
    createTables,
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
    // Bakery Items
    createBakeryItem,
    getAllBakeryItems,
    updateBakeryItem,
    deleteBakeryItem,
    // Bakery Orders
    createBakeryOrder,
    getCustomerBakeryOrders,
    // Juice Items
    createJuiceItem,
    getAllJuiceItems,
    updateJuiceItem,
    deleteJuiceItem,
    // Juice Orders
    createJuiceOrder,
    getCustomerJuiceOrders,
} = require('./dynamoService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
});

// ============= HEALTH CHECK =============
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Jam Jam Resort API',
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
});

// ============= CUSTOMER ROUTES =============

// Create customer
app.post('/api/customers', async (req, res) => {
    try {
        const { name, mobile, walletAmount } = req.body;

        if (!name || !mobile) {
            return res.status(400).json({ error: 'Name and mobile are required' });
        }

        // Check if customer already exists
        const existing = await getCustomerByMobile(mobile);
        if (existing) {
            return res.status(409).json({ error: 'Customer with this mobile already exists', customer: existing });
        }

        // Generate customer ID
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 6);
        const customerId = `JJ-${timestamp}-${randomPart}`.toUpperCase();

        const customer = await createCustomer({
            customerId,
            name,
            mobile,
            walletAmount: walletAmount || 0,
            checkinTime: new Date().toISOString(),
            status: 'checked-in',
        });

        res.status(201).json(customer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// Get all customers
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await getAllCustomers();
        // Sort by checkinTime descending
        customers.sort((a, b) => new Date(b.checkinTime) - new Date(a.checkinTime));
        res.json(customers);
    } catch (error) {
        console.error('Error getting customers:', error);
        res.status(500).json({ error: 'Failed to get customers' });
    }
});

// Search customers
app.get('/api/customers/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json([]);
        }
        const customers = await searchCustomers(q);
        res.json(customers);
    } catch (error) {
        console.error('Error searching customers:', error);
        res.status(500).json({ error: 'Failed to search customers' });
    }
});

// Get customer by ID
app.get('/api/customers/:id', async (req, res) => {
    try {
        const customer = await getCustomerById(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        console.error('Error getting customer:', error);
        res.status(500).json({ error: 'Failed to get customer' });
    }
});

// Update customer
app.put('/api/customers/:id', async (req, res) => {
    try {
        const updates = req.body;
        delete updates.customerId; // Don't allow ID changes

        const customer = await updateCustomer(req.params.id, updates);
        res.json(customer);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// Check out customer
app.post('/api/customers/:id/checkout', async (req, res) => {
    try {
        const customer = await updateCustomer(req.params.id, {
            status: 'checked-out',
            checkoutTime: new Date().toISOString(),
        });
        res.json(customer);
    } catch (error) {
        console.error('Error checking out customer:', error);
        res.status(500).json({ error: 'Failed to checkout customer' });
    }
});

// Delete customer
app.delete('/api/customers/:id', async (req, res) => {
    try {
        await deleteCustomer(req.params.id);
        res.json({ success: true, message: 'Customer deleted' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

// ============= GAMES ROUTES =============

// Get all games
app.get('/api/games', async (req, res) => {
    try {
        const games = await getAllGames();
        res.json(games);
    } catch (error) {
        console.error('Error getting games:', error);
        res.status(500).json({ error: 'Failed to get games' });
    }
});

// Add game
app.post('/api/games', async (req, res) => {
    try {
        const { name, coins, minutes, rate } = req.body;

        if (!name || !rate) {
            return res.status(400).json({ error: 'Name and rate are required' });
        }

        const gameId = `game_${uuidv4().substring(0, 8)}`;
        const game = await createGame({
            gameId,
            name,
            coins: coins || '-',
            minutes: minutes || 0,
            rate: Number(rate),
        });

        res.status(201).json(game);
    } catch (error) {
        console.error('Error adding game:', error);
        res.status(500).json({ error: 'Failed to add game' });
    }
});

// Update game
app.put('/api/games/:id', async (req, res) => {
    try {
        const updates = req.body;
        delete updates.gameId; // Don't allow ID changes

        if (updates.rate) {
            updates.rate = Number(updates.rate);
        }
        if (updates.minutes) {
            updates.minutes = Number(updates.minutes);
        }

        const game = await updateGame(req.params.id, updates);
        res.json(game);
    } catch (error) {
        console.error('Error updating game:', error);
        res.status(500).json({ error: 'Failed to update game' });
    }
});

// Delete game
app.delete('/api/games/:id', async (req, res) => {
    try {
        await deleteGame(req.params.id);
        res.json({ success: true, message: 'Game deleted' });
    } catch (error) {
        console.error('Error deleting game:', error);
        res.status(500).json({ error: 'Failed to delete game' });
    }
});

// Initialize default games
app.post('/api/games/init', async (req, res) => {
    try {
        const games = await initializeDefaultGames();
        res.json({ success: true, message: `Initialized ${games.length} games`, games });
    } catch (error) {
        console.error('Error initializing games:', error);
        res.status(500).json({ error: 'Failed to initialize games' });
    }
});

// ============= BOOKING ROUTES =============

// Create booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { customerId, customerName, customerMobile, items, totalAmount, totalCoins, paymentMethod, service } = req.body;

        if (!items || !totalAmount || !service) {
            return res.status(400).json({ error: 'Items, totalAmount, and service are required' });
        }

        const bookingId = `BK-${uuidv4().substring(0, 8).toUpperCase()}`;
        const booking = await createBooking({
            bookingId,
            customerId: customerId || 'walk-in',
            customerName: customerName || 'Walk-in Customer',
            customerMobile: customerMobile || '',
            items,
            totalAmount: Number(totalAmount),
            totalCoins: totalCoins || 0,
            paymentMethod: paymentMethod || 'Cash',
            service,
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await getAllBookings();
        res.json(bookings);
    } catch (error) {
        console.error('Error getting bookings:', error);
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// Get bookings by customer
app.get('/api/bookings/customer/:customerId', async (req, res) => {
    try {
        const bookings = await getCustomerBookings(req.params.customerId);
        res.json(bookings);
    } catch (error) {
        console.error('Error getting customer bookings:', error);
        res.status(500).json({ error: 'Failed to get customer bookings' });
    }
});

// Get booking by ID
app.get('/api/bookings/:id', async (req, res) => {
    try {
        const booking = await getBookingById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json(booking);
    } catch (error) {
        console.error('Error getting booking:', error);
        res.status(500).json({ error: 'Failed to get booking' });
    }
});

// ============= MENU ITEMS API =============

// Get all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const items = await getAllMenuItems();
        res.json(items);
    } catch (error) {
        console.error('Error getting menu items:', error);
        res.status(500).json({ error: 'Failed to get menu items' });
    }
});

// Create menu item
app.post('/api/menu', async (req, res) => {
    try {
        const itemId = `menu_${uuidv4().slice(0, 8)}`;
        const item = await createMenuItem({ ...req.body, itemId });
        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating menu item:', error);
        res.status(500).json({ error: 'Failed to create menu item' });
    }
});

// Update menu item
app.put('/api/menu/:id', async (req, res) => {
    try {
        const updated = await updateMenuItem(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// Delete menu item
app.delete('/api/menu/:id', async (req, res) => {
    try {
        await deleteMenuItem(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

// ============= COMBOS API =============

// Get all combos
app.get('/api/combos', async (req, res) => {
    try {
        const combos = await getAllCombos();
        res.json(combos);
    } catch (error) {
        console.error('Error getting combos:', error);
        res.status(500).json({ error: 'Failed to get combos' });
    }
});

// Create combo
app.post('/api/combos', async (req, res) => {
    try {
        const comboId = `combo_${uuidv4().slice(0, 8)}`;
        const combo = await createCombo({ ...req.body, comboId });
        res.status(201).json(combo);
    } catch (error) {
        console.error('Error creating combo:', error);
        res.status(500).json({ error: 'Failed to create combo' });
    }
});

// Update combo
app.put('/api/combos/:id', async (req, res) => {
    try {
        const updated = await updateCombo(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        console.error('Error updating combo:', error);
        res.status(500).json({ error: 'Failed to update combo' });
    }
});

// Delete combo
app.delete('/api/combos/:id', async (req, res) => {
    try {
        await deleteCombo(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting combo:', error);
        res.status(500).json({ error: 'Failed to delete combo' });
    }
});

// ============= RESTAURANT ORDERS API =============

// Get all restaurant orders
app.get('/api/restaurant-orders', async (req, res) => {
    try {
        const orders = await getAllRestaurantOrders();
        res.json(orders);
    } catch (error) {
        console.error('Error getting restaurant orders:', error);
        res.status(500).json({ error: 'Failed to get restaurant orders' });
    }
});

// Create restaurant order
app.post('/api/restaurant-orders', async (req, res) => {
    try {
        const orderId = `order_${uuidv4().slice(0, 8)}`;
        const order = await createRestaurantOrder({ ...req.body, orderId });
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating restaurant order:', error);
        res.status(500).json({ error: 'Failed to create restaurant order' });
    }
});

// Get restaurant orders by customer
app.get('/api/restaurant-orders/customer/:customerId', async (req, res) => {
    try {
        const orders = await getCustomerRestaurantOrders(req.params.customerId);
        res.json(orders);
    } catch (error) {
        console.error('Error getting customer restaurant orders:', error);
        res.status(500).json({ error: 'Failed to get customer restaurant orders' });
    }
});

// Get restaurant order by ID
app.get('/api/restaurant-orders/:id', async (req, res) => {
    try {
        const order = await getRestaurantOrderById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        console.error('Error getting restaurant order:', error);
        res.status(500).json({ error: 'Failed to get restaurant order' });
    }
});

// Update restaurant order status (for KOT)
app.patch('/api/restaurant-orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await updateRestaurantOrderStatus(req.params.id, status);
        res.json(updated);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// ============= BAKERY ITEMS ROUTES =============

// Get all bakery items
app.get('/api/bakery-items', async (req, res) => {
    try {
        const items = await getAllBakeryItems();
        res.json(items);
    } catch (error) {
        console.error('Error getting bakery items:', error);
        res.status(500).json({ error: 'Failed to get bakery items' });
    }
});

// Create bakery item
app.post('/api/bakery-items', async (req, res) => {
    try {
        const itemId = `bakery_${uuidv4().slice(0, 8)}`;
        const item = await createBakeryItem({ ...req.body, itemId });
        res.status(201).json(item);
    } catch (error) {
        console.error('Error adding bakery item:', error);
        res.status(500).json({ error: 'Failed to add bakery item' });
    }
});

// Update bakery item
app.put('/api/bakery-items/:id', async (req, res) => {
    try {
        const updates = req.body;
        delete updates.itemId;
        const item = await updateBakeryItem(req.params.id, updates);
        res.json(item);
    } catch (error) {
        console.error('Error updating bakery item:', error);
        res.status(500).json({ error: 'Failed to update bakery item' });
    }
});

// Delete bakery item
app.delete('/api/bakery-items/:id', async (req, res) => {
    try {
        await deleteBakeryItem(req.params.id);
        res.json({ deleted: true });
    } catch (error) {
        console.error('Error deleting bakery item:', error);
        res.status(500).json({ error: 'Failed to delete bakery item' });
    }
});

// ============= BAKERY ORDERS ROUTES =============

// Create bakery order
app.post('/api/bakery-orders', async (req, res) => {
    try {
        const orderId = `bakery_order_${uuidv4().slice(0, 8)}`;
        const order = await createBakeryOrder({ ...req.body, orderId });
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating bakery order:', error);
        res.status(500).json({ error: 'Failed to create bakery order' });
    }
});

// Get orders by customer
app.get('/api/bakery-orders/customer/:customerId', async (req, res) => {
    try {
        const orders = await getCustomerBakeryOrders(req.params.customerId);
        res.json(orders);
    } catch (error) {
        console.error('Error getting bakery orders:', error);
        res.status(500).json({ error: 'Failed to get bakery orders' });
    }
});

// ============= JUICE ITEMS ROUTES =============

// Get all juice items
app.get('/api/juice-items', async (req, res) => {
    try {
        const items = await getAllJuiceItems();
        res.json(items);
    } catch (error) {
        console.error('Error getting juice items:', error);
        res.status(500).json({ error: 'Failed to get juice items' });
    }
});

// Create juice item
app.post('/api/juice-items', async (req, res) => {
    try {
        const itemId = `juice_${uuidv4().slice(0, 8)}`;
        const item = await createJuiceItem({ ...req.body, itemId });
        res.status(201).json(item);
    } catch (error) {
        console.error('Error adding juice item:', error);
        res.status(500).json({ error: 'Failed to add juice item' });
    }
});

// Update juice item
app.put('/api/juice-items/:id', async (req, res) => {
    try {
        const updates = req.body;
        delete updates.itemId;
        const item = await updateJuiceItem(req.params.id, updates);
        res.json(item);
    } catch (error) {
        console.error('Error updating juice item:', error);
        res.status(500).json({ error: 'Failed to update juice item' });
    }
});

// Delete juice item
app.delete('/api/juice-items/:id', async (req, res) => {
    try {
        await deleteJuiceItem(req.params.id);
        res.json({ deleted: true });
    } catch (error) {
        console.error('Error deleting juice item:', error);
        res.status(500).json({ error: 'Failed to delete juice item' });
    }
});

// ============= JUICE ORDERS ROUTES =============

// Create juice order
app.post('/api/juice-orders', async (req, res) => {
    try {
        const orderId = `juice_order_${uuidv4().slice(0, 8)}`;
        const order = await createJuiceOrder({ ...req.body, orderId });
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating juice order:', error);
        res.status(500).json({ error: 'Failed to create juice order' });
    }
});

// Get orders by customer
app.get('/api/juice-orders/customer/:customerId', async (req, res) => {
    try {
        const orders = await getCustomerJuiceOrders(req.params.customerId);
        res.json(orders);
    } catch (error) {
        console.error('Error getting juice orders:', error);
        res.status(500).json({ error: 'Failed to get juice orders' });
    }
});

// ============= INITIALIZATION =============

// Initialize database tables
app.post('/api/init', async (req, res) => {
    try {
        await createTables();
        res.json({ success: true, message: 'Database initialized successfully' });
    } catch (error) {
        console.error('Error initializing database:', error);
        res.status(500).json({ error: 'Failed to initialize database' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
    try {
        console.log('\n🏨 Jam Jam Resort API Server');
        console.log('============================\n');

        // Initialize DynamoDB tables on startup
        console.log('🔧 Checking DynamoDB tables...');
        await createTables();

        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log('\n📡 Available Endpoints:');
            console.log('   GET  /api/health');
            console.log('   ---- Customers ----');
            console.log('   POST /api/customers');
            console.log('   GET  /api/customers');
            console.log('   GET  /api/customers/search?q=...');
            console.log('   GET  /api/customers/:id');
            console.log('   PUT  /api/customers/:id');
            console.log('   POST /api/customers/:id/checkout');
            console.log('   DELETE /api/customers/:id');
            console.log('   ---- Games ----');
            console.log('   GET  /api/games');
            console.log('   POST /api/games');
            console.log('   PUT  /api/games/:id');
            console.log('   DELETE /api/games/:id');
            console.log('   POST /api/games/init');
            console.log('   ---- Bookings ----');
            console.log('   POST /api/bookings');
            console.log('   GET  /api/bookings');
            console.log('   GET  /api/bookings/customer/:customerId');
            console.log('   GET  /api/bookings/:id');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
