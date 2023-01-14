import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import daysjs from "dayjs"
import joi from 'joi'
import { userSchema, messageSchema } from "../validator.js"
import { stripHtml } from 'string-strip-html'

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
    const name = req.body.name

    const validation = userSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const erros = validation.error.details.map((err) => {
            return err.message
        })
        return res.status(422).send(erros)
    }

    try {
        const resp = await db.collection("participants").findOne({ name })
        if (resp) return res.sendStatus(409)
        await db.collection("participants").insertOne({ name: name, lastStatus: Date.now() })
        await db.collection("messages").insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hour })
        return res.sendStatus(201)
    } catch (err) {

        return res.sendStatus(404)
    }

})

app.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("participants").find({}).toArray()
        return res.send(participants)

    } catch (error) {
        console.log(error)
        res.status(500).send("Houve um problema no banco de dados!")
    }

})

app.post("/messages", async (req, res) => {
    const user = req.headers.user
    const result = await db.collection("participants").findOne({ name: user })

    if (!result || !user) return res.sendStatus(422)
    const message = req.body
    const validationMessage = messageSchema.validate(message, { abortEarly: false })

    if (validationMessage.error) {
        const erros = validationMessage.error.details.map((err) => {
            console.log('13')
            return err.message
        })
        return res.status(422).send(erros)
    }


    try {
        await db.collection("messages").insertOne({ from: user, to: message.to, text: message.text, type: message.type, time: hour })
        res.sendStatus(201)

    } catch (error) {
        console.log(error)
        res.status(500).send("Houve um problema no banco de dados!")
    }



})


app.get("/messages?:limit", async (req, res) => {
    const { user } = req.headers
    const { limit } = req.query

    try {
        const resp = await db.collection("participants").findOne({ name: user })
        if (!resp) return res.sendStatus(404)
        const messages = await db.collection("messages").find({ $or: [{ to: 'Todos' }, { to: user }, { from: user }] }).toArray()
        if (limit && limit <= 0 || limit && isNaN(limit)) return res.sendStatus(422)
        if (!limit) return res.send(messages.reverse())
        return res.send(messages.slice(-limit).reverse())


    } catch (error) {
        console.log(error)
        res.status(500).send("Houve um problema no banco de dados!")

    }
})

app.post("/status", async (req, res) => {
    const { user } = req.headers

    try {
        const resp = await db.collection("participants").findOne({ name: user })
        if (!resp) return res.sendStatus(404)
        await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } })
        return res.sendStatus(200)

    } catch (error) {
        console.log(error)
        res.status(500).send("Houve um problema no banco de dados!")

    }


})

app.delete("/messages/:id", async (req, res) => {
    const { id } = req.params
    const { user } = req.headers
   
    try {
        const result = await db.collection("messages").findOne({ _id: ObjectId(id) })
        if (user !== result.from) return res.sendStatus(401)
        const message = await db.collection("messages").deleteOne({ _id: ObjectId(id) })
        console.log(message)
        if (!message) return res.send(404)
   
        return res.sendStatus(200)

    } catch (error) {
        console.log(error)
        res.status(500).send("Houve um problema no banco de dados!")


    }


})

app.put("/messages/:id", async (req, res) => {
    const { to, text, type } = req.body
    const { user } = req.headers
    const messageId = req.params

    try {
        const message = await db.collection("messages").findOne({ _id: ObjectId(messageId) })
        if (!message) return res.sendStatus(404)

        if (message.from !== user) return res.sendStatus(401)

        const result = await db.collection("messages").updateOne({ _id: ObjectId(messageId) }, { $set: { text } })
        if (result.modifiedCount === 0) return res.status(404).send("Esta mensagem não existe")

        res.sendStatus(200)

    } catch (error) {
        console.log(error)
        res.status(500).send("Houve um problema no banco de dados!")
    }



})

setInterval(removeUser, 15000)

async function removeUser() {
    try {
        const part = await db.collection("participants").find({}).toArray()

        part.forEach(async (p) => {
            if (Date.now() - p.lastStatus > 10000) {
                await db.collection("participants").deleteOne({ _id: ObjectId(p._id) })
                await db.collection("messages").insertOne({ from: p.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: hour })
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).send("Houve um problema no banco de dados!")
    }

}

const PORT = 5000
app.listen(PORT, () => {
    console.log("Server on")
})