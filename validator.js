import joi from 'joi'


export const userSchema = joi.object({
    name : joi.string().required()
}).allow("name")

export const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required()
}).allow("to", "text", "type")

