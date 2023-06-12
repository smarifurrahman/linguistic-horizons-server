const express = require('express');
const cors = require('cors');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Linguistic Horizons is running')
})

app.listen(port, () => {
    console.log(`Linguistic Horizons Server is running on port ${port}`)
})