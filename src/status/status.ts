import * as express from 'express';
import { loginRequired, loginRequiredApi } from '../auth/auth'
import UserModel from '../models/user'
import * as mongoose from 'mongoose'
import { servicesClient } from '../wrappers/services'
import services from '../wrappers/services'
import * as multiparty from 'multiparty'

var router = express.Router()
export default router

router.get('/', (req, res) => {
    res.render('status/status', { services })
})
