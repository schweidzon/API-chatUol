import joi from 'joi'


export const userSchema = joi.object({
    name : joi.string().required()
}).allow("name")

export const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("private_message", "message").required()
}).allow("to", "text", "type")

export const statusSchema = joi.object({
    user : joi.string().required()
}).allow("name")

