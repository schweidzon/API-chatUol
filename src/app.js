import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import daysjs from "dayjs"
import  {userSchema}  from "../validator.js"



dotenv.config()
const app = express()
app.use(express.json())
app.use(cors())
let hour
setInterval(() => {
    hour = daysjs().format("HH:mm:ss")

}, 1)



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
    //const result = await userSchema.validateAsync(req.body)
    const { name } = req.body
    try {
        const resp = await db.collection("participants").findOne({ name })
        console.log(resp)
        if (resp) return res.sendStatus(409)
        await db.collection("participants").insertOne({ name, lastStatus: Date.now() })
        await db.collection("messages").insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hour })
        return res.sendStatus(201)
    } catch (err) {
     
        return res.sendStatus(404)
    }

})
app.get("/participants", async (req, res) => {
    const participants = await db.collection("participants").find({}).toArray()
    // const user =  req.headers.user
    // const resp = await db.collection("participants").findOne({ name: user })
    // console.log((Number(hour.slice(-2)) - Number(resp.lastStatus.slice(-2))))
    // console.log(resp)
    // setInterval(async ()=> {
    //     if(!resp) return res.sendStatus(404)
    //     if((Number(hour.slice(-2)) - Number(resp.lastStatus.slice(-2))) > 10) {
    //         await db.collection("participants").deleteOne({ name: user })
    //         await db.collection("messages").insertOne({ from: user, to: 'Todos', text: 'sai da sala...', type: 'status', time: hour })

    //         return res.sendStatus(404)
    //     }

    // }, 15000)
    return res.send(participants)

})
app.post("/messages", async (req, res) => {
    const user = req.headers.user
    const { to, text, type } = req.body


    await db.collection("messages").insertOne({ from: user, to, text, type, time: hour })
    res.sendStatus(201)
})


app.get("/messages?:limit", async (req, res) => {
    const user = req.headers.user  
    const limit = req.query.limit


    const resp = await db.collection("participants").findOne({ name: user })
    
    if (!resp) return res.sendStatus(404)


    if (Date.now() - (resp.lastStatus) > 10000) {
        await db.collection("participants").deleteOne({ name: user })
        await db.collection("messages").insertOne({ from: user, to: 'Todos', text: 'sai da sala...', type: 'status', time: hour })
        return res.sendStatus(404)
    }


    const messages = await db.collection("messages").find({ $or: [{ to: 'Todos' }, { to: user }, { from: user }] }).toArray()
    console.log(messages)
    //const messages = await db.collection("messages").find({}).toArray()
    if (!limit) return res.send(messages)
    return res.send(messages.slice(-limit))
})
app.post("/status", async (req, res) => {
    const user = req.headers.user
    const resp = await db.collection("participants").findOne({ name: user })
    if (!resp) return res.sendStatus(404)
    await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } })
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

app.delete("/messages/:id", async (req, res) => {
const {id} = req.params
const user = req.headers.user
console.log(user)
const message = await db.collection("messages").deleteOne({_id : ObjectId(id)})
if (!message) return res.send(404)
if(user !== message.from)  return res.sendStatus(401)
return res.sendStatus(200)
}) 

app.put("/messages/:id", async (req, res) => {
const newMessage = req.body
const user = req.headers.user
const messageId = req.params
console.log(newMessage)

const message = await db.collection("messages").findOne({_id : ObjectId(messageId)})
if(!message) return res.sendStatus(404)

if(message.from !== user) return res.sendStatus(401)

await db.collection("messages").updateOne({_id: ObjectId(messageId)}, {$set : {text : newMessage.text}})

res.sendStatus(200)
})




const PORT = 5000
app.listen(PORT, () => {
    console.log("Server on")
})