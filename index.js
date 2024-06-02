const express = require('express');
const cors = require('cors');
const app=express()
const port=process.env.PORT || 5000;

// middleWere
app.use(cors())
app.use(express.json())


app.get('/',(req,res)=>{
    res.send('SCHOLARSHIP-IN-EUROPE-RUNNING')
})

app.listen(port,()=>{
    console.log(`scholarship-in-europe on port ${port}`)
})