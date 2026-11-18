require('express-async-errors');
const express = require('express');
const cors = require('cors');
const { port, clientOrigin } = require('./config/env');
const { UPLOAD_DIR } = require('./middleware/upload');
const { errorHandler, notFound } = require('./middleware/error');
const authRoutes = require('./routes/auth');
const catalogueRoutes = require('./routes/catalogue');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'urbancart-api' }));
app.use('/api/auth', authRoutes);
app.use('/api', catalogueRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`UrbanCart API listening on http://localhost:${port}`);
});

module.exports = app;