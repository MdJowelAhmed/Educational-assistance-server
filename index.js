const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


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
    const paymentCollection = client.db('scholarshipDB').collection('payments')
    const applyCollection = client.db('scholarshipDB').collection('apply')

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


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

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      console.log('hello admin')
      const user = req.user
      const query = { email: user?.email }
      const result = await usersCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'unauthorized access!!' })

      next()
    }

    // verify moderator middleware
    const verifyModerator = async (req, res, next) => {
      console.log('hello moderator')
      const user = req.user
      const query = { email: user?.email }
      const result = await usersCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'moderator') {
        return res.status(401).send({ message: 'unauthorized access!!' })
      }

      next()
    }

    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      console.log(token)
      res.send({ token });
    })

    app.post('/scholarship', async (req, res) => {
      const scholarship = req.body
      const result = await scholarshipCollection.insertOne(scholarship)
      res.send(result)
    })
    app.get('/scholarship', async (req, res) => {
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) - 1
      console.log(size, page)
      console.log('page', page)
      const result = await scholarshipCollection.find().skip(page * size).limit(size).toArray()
      res.send(result)
    })
    app.get('/countScholarship', async (req, res) => {
      const count = await scholarshipCollection.countDocuments()
      res.send({ count })
    })

    // delete a scholarship
    app.delete('/scholarship/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await scholarshipCollection.deleteOne(query)
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

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })

    app.patch('/users/moderator/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'moderator'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.get('/detailsScholarship/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await scholarshipCollection.findOne(query)
      res.send(result)
    })

    // payment create 
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const { total } = req.body
      console.log(total, req.body)
      const amount = parseInt(total * 100)
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.post('/payments', verifyToken, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send({ result });
    })

    app.post('/apply', async (req, res) => {
      const apply = req.body
      const result = await applyCollection.insertOne(apply)
      res.send(result)
    })

    app.get('/apply', async (req, res) => {
      const result = await applyCollection.find().toArray()
      res.send(result)
    })

    app.get('/apply/:email',async (req, res) => {
        const email = req.params.email
        const query = { 'user.email': email }
        const result = await bookingsCollection.find(query).toArray()
        res.send(result)
      })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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