// Portfolio.js
// Code for charting 

var ctx = document.getElementById("portfolio-pie")

var data = {
    datasets: [{
        data: cryptoBalances.map((x) => x.btcValue),
        backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56"
        ],
        hoverBackgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56"
        ]
    }],

    // These labels appear in the legend and in the tooltips when hovering different arcs
    labels: cryptoBalances.map((x) => x.currency)
};

var portfolioPieChart = new Chart(ctx, {
    type: 'pie',
    data: data,
    options: {}
})

var historyCtx = document.getElementById("portfolio-value-history");

var historyData = {
    labels: portfolioHistory.map((x) => x.timestamp),
    datasets: [{
        data: portfolioHistory.map((p) => {
            if (!p.balances.length)
                return {x: p.timestamp, y: 0.0}

            var btc_balance = p.balances
                .map(b=>parseFloat(b.btcValue))
                .reduce((a,b)=>a+b,0.0)

            console.log(p.balances)
            console.log(btc_balance)
            return {x: p.timestamp, y: btc_balance}
        })
    }]
}
historyData.datasets[0].data.push({x: +Date.now(), y: historyData.datasets[0].data[historyData.datasets[0].data.length-1].y});

var historyOptions = {
    title:{
        text: "Bitcoin balance over time"
    },
    scales: {
        xAxes: [{
            type: "time",
            time: {
                //format: 'MM/DD/YYYY HH:mm',
                // round: 'day'
                unit: 'month',
                tooltipFormat: 'll HH:mm'
            },
            scaleLabel: {
                display: true,
                labelString: 'Date'
            }
        }, ],
        yAxes: [{
            scaleLabel: {
                display: true,
                labelString: 'value'
            }
        }]
    },
}


var portfolioPriceHistoryChart = new Chart(historyCtx, {
    type: 'line',
    data: historyData,
    options: historyOptions
});

