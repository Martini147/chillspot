// server/index.js (top)
//app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const db = require('./db');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploads folder statically:
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup:
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname;
    cb(null, unique);
  }
});
const upload = multer({ storage });


// GET all markers
app.get('/api/markers', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM markers ORDER BY created_at DESC');
    res.json(rows);
  });
  
  // POST new marker (with optional image)
  app.post('/api/markers', upload.single('image'), async (req, res) => {
    const { title, description, lat, lng } = req.body;
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    const text = `
      INSERT INTO markers(title, description, lat, lng, image_url)
      VALUES($1,$2,$3,$4,$5) RETURNING *`;
    const values = [title, description, lat, lng, imageUrl];
    const { rows } = await db.query(text, values);
    res.status(201).json(rows[0]);
  });
  
  // DELETE a marker
  app.delete('/api/markers/:id', async (req, res) => {
    const { id } = req.params;
    await db.query('DELETE FROM markers WHERE id=$1', [id]);
    res.sendStatus(204);
  });
  
  // Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
  
