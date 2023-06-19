const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

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
        const classesCollection = client.db('linguisticHorizons').collection('classes');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ token })
        })


        // use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'Admin') {
                return res.status(403).send({ error: true, message: 'not an admin, access forbidden' });
            }
            next();
        }

        // use verifyJWT before using verifyInstructor
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'Instructor') {
                return res.status(403).send({ error: true, message: 'not an instructor, access forbidden' });
            }
            next();
        }

        // users
        app.get('/users', async (req, res) => {
            let query = {};
            if (req.query?.role) {
                query = { role: req.query.role };
            }

            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/users/check-admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'Admin' }
            res.send(result);
        })

        app.get('/users/check-instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'Instructor' }
            res.send(result);
        })

        app.get('/users/check-student/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ student: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { student: user?.role === 'Student' }
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
        app.patch('/users/admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;

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

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'Instructor'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // classes
        app.get('/classes', async (req, res) => {
            let query = {};
            if (req.query?.status) {
                query = { status: req.query.status };
            }
            else if (req.query?.email) {
                query = { instructorEmail: req.query.email };
            }

            let options = {};
            console.log(req.query?.sort)
            if (req.query?.sort) {
                options = { sort: { enrolledStudentsCount: -1 } };
            }

            const result = await classesCollection.find(query, options).toArray();
            res.send(result);
        })

        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classesCollection.findOne(query);
            res.send(result);
        })

        // find selected classes
        app.post('/selected-classes', async (req, res) => {
            const id = req.body;
            const ids = id.map(i => new ObjectId(i))
            const result = await classesCollection.find({ _id: { $in: ids } }).toArray();
            res.send(result);
        })

        // find enrolled classes
        app.get('/enrolled-classes', async (req, res) => {
            const email = req.query.email;
            const query = { enrolledStudents: { $in: [email] } }
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        })

        // app.get('/popular-classes', async (req, res) => {
        //     const options = { sort: { enrolledStudentsCount: -1 } };
        //     const result = await classesCollection.find({}, options).toArray();
        //     res.send(result);
        // });

        // if enrolledStudents in some elements we need to match first, if all has value we do't need this match
        // app.get('/popular-classes', async (req, res) => {
        //     const result = await classesCollection.aggregate([
        //         { $match: { enrolledStudents: { $exists: true, $type: 'array' } } },
        //         { $addFields: { enrolledStudentsCount: { $size: "$enrolledStudents" } } },
        //         { $sort: { enrolledStudentsCount: -1 } }
        //     ]).toArray();
        //     res.send(result);
        // });

        // update the db with enrolledStudents for all classes
        // app.get('/classes-update', async (req, res) => {
        //     try {
        //         const classes = await classesCollection.find().toArray();

        //         for (const classItem of classes) {
        //             const enrolledStudentsCount = classItem.enrolledStudents.length;

        //             await classesCollection.updateOne(
        //                 { _id: new ObjectId(classItem._id) },
        //                 { $set: { enrolledStudentsCount: enrolledStudentsCount } }
        //             );
        //         }

        //         res.send("Enrolled students count updated for all classes");
        //     } catch (error) {
        //         res.status(500).send(error);
        //     }
        // });

        app.post('/addClass', async (req, res) => {
            const classInfo = req.body;
            const result = await classesCollection.insertOne(classInfo);
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
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'Approved'
                },
            };

            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // deny class
        app.patch('/classes/denied/:id', async (req, res) => {
            const id = req.params.id;
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
            const enrolledStudents = classInfo.enrolledStudents;

            if (enrolledStudents.includes(email)) {
                return res.send({ enrolled: true, message: 'Already enrolled' });
            }

            const updateResult = await classesCollection.updateOne(
                query,
                {
                    $addToSet: { enrolledStudents: email },
                    $inc: { enrolledStudentsCount: 1, availableSeats: -1 }
                }
            );

            res.send(updateResult);
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