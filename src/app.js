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


const PORT = 5000
app.listen(PORT, () => {
    console.log("Server on")
})