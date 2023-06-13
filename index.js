const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gchp2yo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const instructorsCollection = client.db('linguisticHorizons').collection('instructors');
        const classesCollection = client.db('linguisticHorizons').collection('classes');

        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result);
        })

        app.post('/addInstructors', async (req, res) => {
            const instructorsInfo = req.body;
            console.log(instructorsInfo);
            const result = await instructorsCollection.insertOne(instructorsInfo);
            res.send(result);
        })

        app.get('/instructors/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await instructorsCollection.findOne(query);
            res.send(result);
        })

        // classes
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        })

        app.post('/addClass', async (req, res) => {
            const classInfo = req.body;
            console.log(classInfo);
            const result = await classesCollection.insertOne(classInfo);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Linguistic Horizons is running')
})

app.listen(port, () => {
    console.log(`Linguistic Horizons Server is running on port ${port}`)
})