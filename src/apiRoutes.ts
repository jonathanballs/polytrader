import * as poloniex from 'poloniex.js'
import * as _ from 'underscore'
function routes(app){
    app.get('/api/balances',(req,res)=>{
        var polo = new poloniex(req.user.poloniexAPIKey, req.user.poloniexAPISecret)
        polo.returnCompleteBalances((err,balances)=>
            {
                if(err)
                    res.send("Error " + err)
                //Mad filtering
                res.send( _.pick(balances,(currency)=>{
                    return parseFloat(currency.available)*10000 + parseFloat(currency.onOrders)*10000  != 0
                }))
            })

    })
}

module.exports = routes
