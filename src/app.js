import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import daysjs from "dayjs"



dotenv.config()
const app = express()
app.use(express.json())
app.use(cors())
let hour
setInterval(() => {
    hour = daysjs().format("HH:mm:ss")

}, 1)
console.log(hour)


const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db

try {
    await mongoClient.connect()
    db = mongoClient.db()    
    console.log("Conectou ao banco de dados")


} catch (err) {
    console.log("Não conectou ao banco de dados")
}


app.post("/participants", async (req, res) => {
const {name} = req.body
try {
    const resp = await db.collection("participants").findOne({name})
    if (resp) return res.status(409).send("Usuário já cadastrado")
    await db.collection("participants").insertOne({name, lastStatus: hour})
    await db.collection("messages").insertOne({from: name, to: 'Todoss', text: 'entra na sala...', type: 'status', time: hour})
    return res.sendStatus(201)
} catch(err) {
    return res.sendStatus(404)
}

})
app.get("/participants", async (req, res) => {
    const resp =  await db.collection("participants").find({}).toArray()
    return res.send(resp)
  
})
app.post("/messages", async (req, res) => {
    

   

})
app.get("/messages?:limit", async (req, res) => {
    const user = req.headers.user
    const limit = req.query.limit
   
    const resp = await db.collection("participants").findOne({name:user})
  
    if(Number(hour.slice(-2)) - Number(resp.lastStatus.slice(-2)) > 10) {
        await db.collection("participants").deleteOne({name:user})
        await db.collection("messages").insertOne({from: user, to: 'Todos', text: 'sai da sala...', type: 'status', time: hour})
        return res.sendStatus(404)
    }
    const messages = await db.collection("messages").find({$or: [{to:'Todos'}, {to:user}, {from:user}] }).toArray()
   
    return res.send(messages.slice(-limit))
})
app.post("/status", async (req, res) => {
    const user = req.headers.user
    const resp = await db.collection("participants").findOne({name:user})
    if(!resp) return res.sendStatus(404)
    await db.collection("participants").updateOne({name:user}, { $set : {lastStatus : hour}})
    // console.log(hour.slice(-2))
    // console.log(resp.lastStatus.slice(-2))
    // console.log(resp)
    // if(Number(hour.slice(-2)) - Number(resp.lastStatus.slice(-2)) > 10 ) {
    //     await db.collection("participants").deleteOne({name:user})
    //     await db.collection("messages").insertOne({from: user, to: 'Todos', text: 'sai da sala...', type: 'status', time: hour})
    // }
    // console.log(Number(hour.slice(-2)) - Number(resp.lastStatus.slice(-2)))
   
    return res.sendStatus(200)
   
})




const PORT = 5000
app.listen(PORT, () => {
    console.log("Server on")
})