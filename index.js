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

        const usersCollection = client.db('linguisticHorizons').collection('users');
        const instructorsCollection = client.db('linguisticHorizons').collection('instructors');
        const classesCollection = client.db('linguisticHorizons').collection('classes');

        // users
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        // make admin
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'Admin'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // make instructor
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'Instructor'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // instructors
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
            let query = {};
            if (req.query?.status) {
                query = { status: req.query.status };
            }

            const result = await classesCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await classesCollection.findOne(query);
            res.send(result);
        })

        // find selected classes
        app.post('/selected-classes', async (req, res) => {
            const id = req.body;
            console.log({ id })
            const ids = id.map(i => new ObjectId(i))
            const result = await classesCollection.find({ _id: { $in: ids } }).toArray();
            res.send(result);
        })

        app.post('/addClass', async (req, res) => {
            const classInfo = req.body;
            console.log(classInfo);
            const result = await classesCollection.insertOne(classInfo);
            res.send(result);
        })

        // filter class by email
        app.get('/classes/:email', async (req, res) => {
            const email = req.params.email;
            const query = { instructorEmail: email };
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        })

        // update class info
        app.patch('/classes/updateclass/:id', async (req, res) => {
            const id = req.params.id;
            const updateInfo = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: updateInfo,
            };

            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // approve class
        app.patch('/classes/approved/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'Approved'
                },
            };

            const result = await classesCollection.updateOne(filter, updateDoc);
            console.log(result)
            res.send(result);
        })

        // deny class
        app.patch('/classes/denied/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'Denied'
                },
            };

            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // send feedback
        app.patch('/classes/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const feedback = req.body.feedback;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    feedback: feedback
                },
            };

            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // select class and set to user with selectedClass array
        app.patch('/classes/selected/:id', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            const id = req.params.id;
            let selectedClasses = [];

            if (!user.selectedClasses) {
                selectedClasses = [id];
            }
            else {
                const isExist = user.selectedClasses.find(classId => classId === id);
                if (!isExist) {
                    selectedClasses = [...user.selectedClasses, id];
                }
                else {
                    return res.send({ selected: true, message: 'Already Selected' });
                }
            }

            const updateDoc = {
                $set: {
                    selectedClasses: selectedClasses
                },
            };

            const result = await usersCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        // enroll a class and set to classes with enrolledClass array
        app.patch('/classes/enrolled/:id', async (req, res) => {
            const email = req.query.email;
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };
            const classInfo = await classesCollection.findOne(query);

            let enrolledStudents = [];

            if (!classInfo.enrolledStudents) {
                enrolledStudents = [email];
            }
            else {
                const isExist = classInfo.enrolledStudents.find(emailId => emailId === email);
                if (!isExist) {
                    enrolledStudents = [...classInfo.enrolledStudents, email];
                }
                else {
                    return res.send({ enrolled: true, message: 'Already Enrolled' });
                }
            }

            const updateDoc = {
                $set: {
                    enrolledStudents: enrolledStudents
                },
            };

            const result = await classesCollection.updateOne(query, updateDoc);
            res.send(result);
        })


        // delete selectedClass
        app.patch('/classes/selected/delete/:id', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            const id = req.params.id;
            let selectedClasses = user.selectedClasses;

            const filtered = selectedClasses.filter(classId => classId !== id);

            const updateDoc = {
                $set: {
                    selectedClasses: filtered
                },
            };

            const result = await usersCollection.updateOne(query, updateDoc);
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