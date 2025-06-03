require('dotenv').config(); // Load environment variables
const express = require('express');
const session = require('express-session');
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const path = require('path');
const sequelize = require('./config/database');
const Gallery = require('./models/gallery');
const upload = require('./middleware/upload');

const app = express();

// ========= Session Store Setup =========
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: "Session",
  checkExpirationInterval: 15 * 60 * 1000, // Clean expired sessions every 15 mins
  expiration: 24 * 60 * 60 * 1000, // 1 day session expiration
});

// ========= Trust proxy in production =========
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ========= Middleware =========
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ========= Session Setup =========
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  })
);

// ========= View Engine =========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========= Route Imports =========
const authRoutes = require('./routes/authRoutes');
const pageRoutes = require('./routes/pageRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const newsRoutes = require('./routes/newsRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ========= Register Routes =========
app.use('/', pageRoutes);
app.use('/', authRoutes);
app.use('/', membershipRoutes);
app.use('/', newsRoutes);
app.use('/', feedbackRoutes);
app.use('/', galleryRoutes);
app.use('/', adminRoutes);

// ========= Admin Gallery Page =========
app.get('/admingallery', async (req, res) => {
  try {
    const images = await Gallery.findAll({
      order: [['created_at', 'DESC']]
    });
    res.render('gallery', { images });
  } catch (err) {
    console.error('Sequelize error:', err);
    res.status(500).send('Database error');
  }
});

// ========= Upload Image Route =========
app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).send('No file uploaded');
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    await Gallery.create({ image_url: imageUrl });

    res.redirect('/gallery');
  } catch (err) {
    console.error('Error saving image:', err);
    res.status(500).send('Error saving image');
  }
});

// ========= About Us Page =========
app.get('/about-us', async (req, res) => {
  try {
    const images = await Gallery.findAll({
      order: [['createdAt', 'DESC']],
    });

    res.render('about-us', { images });
  } catch (error) {
    console.error('Error loading About Us page:', error);
    res.status(500).send('Server error');
  }
});

// ========= Sync DB and Start Server =========
sessionStore
  .sync()
  .then(() => sequelize.sync({ alter: true })) // alter for development, switch to false for production
  .then(() => {
    console.log("✅ Database and session store synchronized!");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Error syncing the database or session store:", error);
  });
