console.clear();
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const mongoString = process.env.DATABASE_URL;
const cookieParser = require('cookie-parser');
app.use(cookieParser());

mongoose.connect(mongoString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
const database = mongoose.connection;

database.on('error', (error) => {
    console.log(error);
});

database.once('connected', () => {
    console.log('Database Connected');
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const jwt = require('jsonwebtoken')

const bcrypt = require("bcryptjs");
app.set("view engine", "ejs");

const APIroutes = require('./routes/route');
const AuthRoutes = require('./routes/auth');
/* const EmailRoutes = require('./routes/email') */

app.use('/api', APIroutes)
app.use('/api/auth', AuthRoutes)
/* app.use('/api/email', EmailRoutes) */

app.get("/", (req, res) => {
    res.send("Express on Vercel");
});

app.listen(PORT, () => {
    console.log(`Server Started at ${PORT}`);
});
