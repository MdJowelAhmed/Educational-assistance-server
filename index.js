const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5000;

// middleWere
app.use(cors())
app.use(express.json())


// mongodb code 



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ma7e2wv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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

    const scholarshipCollection = client.db('scholarshipDB').collection('scholarship')
    const usersCollection = client.db('scholarshipDB').collection('users')
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // middlewares 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    app.post('/scholarship', async (req, res) => {
      const scholarship = req.body
      const result = await scholarshipCollection.insertOne(scholarship)
      res.send(result)
    })
    app.get('/scholarship', async (req, res) => {
      // const scholarship=req.body
      const result = await scholarshipCollection.find().toArray()
      res.send(result)
    })

    // user api 
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/detailsScholarship/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await scholarshipCollection.findOne(query)
      res.send(result)
    })

    app.post('/create-payment-intent', async (req, res) => {
      const totalFee = req.body.totalFee
      const totalFeeInCent = parseFloat(totalFee) * 100
      if (!totalFee || totalFeeInCent < 1) return
      // generate clientSecret
      const { client_secret } = await stripe.paymentIntents.create({
        amount: totalFeeInCent,
        currency: 'usd',
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        automatic_payment_methods: {
          enabled: true,
        },
      })
      // send client secret as response
      res.send({ clientSecret: client_secret })
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
  res.send('SCHOLARSHIP-IN-EUROPE-RUNNING')
})

app.listen(port, () => {
  console.log(`scholarship-in-europe on port ${port}`)
})