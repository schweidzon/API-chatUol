import Joi from '@hapi/joi'

export const userSchema = Joi.object({
    name : Joi.string().required()
})

