require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const safetyData = require("./dataset/safetyData.json");



const routesApi = require('./routes/routesAPI');
const syncApi = require('./routes/syncAPI');
const sosApi = require('./routes/sosAPI');
const authApi = require('./routes/authAPI');
const incidentApi = require('./routes/incidentAPI');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authApi);
app.use('/routes', routesApi);
app.use('/incident', incidentApi);
app.use('/sos', sosApi);
app.use('/sync', syncApi);

app.get('/', (req, res) => res.send('SafeWalk backend running'));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.io setup for real-time features
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  }
});

io.on('connection', socket => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));

  // Example event: user broadcasting location
  socket.on('user-location', (payload) => {
    // broadcast to guardians or rooms as needed
    io.emit('user-location', payload);
  });

  // Example: SOS from a client forwarded to all connected clients
  socket.on('sos', (data) => {
    io.emit('sos-alert', data);
  });
});

// Make io accessible to routes via app.locals
app.locals.io = io;

mongoose.connect(process.env.MONGO_URI || '', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connection error', err);
    // even if DB fails in dev, still start server for testing non-DB routes
    server.listen(PORT, () => console.log(`Server running (no DB) on port ${PORT}`));
  });