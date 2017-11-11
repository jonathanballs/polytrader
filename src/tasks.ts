// Task processing for polytrader
import * as kue from 'kue'
import UserModel from './models/user'

// Connect to redis
var queue = kue.createQueue({
    redis: {
        host: 'redis',
    }
})

queue.process('sync-account', (job, done) => {

    UserModel.findOne(
        { "accounts._id": job.data.accountID }
    )
    .then(user => {
        console.log(job.data.title)
        user.accounts[0].sync()
        done()
    })
    .catch(err => {
        console.log("Tried to update account with ID of", job.data.id,
                                            "but recieved error: ", err)
        done()
    })
})

export default queue
