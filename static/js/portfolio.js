// Portfolio.js
// Code for charting 

var ctx = document.getElementById("portfolio-pie")

// A combined portfolio that represents the entire portfolio of the user

var data = {
    datasets: [{
        data: portfolioHistories[1][portfolioHistories[1].length - 1].balances.filter(b => b.btcValue != '0.0').map(b => b.btcValue),
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
    labels: portfolioHistories[1][portfolioHistories[1].length - 1].balances.filter(b => b.btcValue != '0.0').map(b => b.currency),

    // These labels appear in the legend and in the tooltips when hovering
    // different arcs labels: cryptoBalances.map((x) => x.currency)
};

var portfolioPieChart = new Chart(ctx, {
    type: 'pie',
    data: data,
    options: {}
})

var series = portfolioHistories.map(ph => {
    return ph.map((p) => {

        if (!p.balances.length)
            return [Date.parse(p.timestamp), 0.0]

        var btc_balance = p.balances
            .map(b => parseFloat(b.btcValue))
            .reduce((a, b) => a + b, 0.0)

        return [Date.parse(p.timestamp), btc_balance]
    })
})

var dates = new Set()
series.forEach(d => {
    d.forEach(p => {
        dates.add(p[0])
    })
})
dates = Array.from(dates).sort()

var data1 = dates.map(date => {
    var portfoliosAtTime = series.map(s => {
        var portfoliosToDate = s.filter(p => p[0] < date)
        if (!portfoliosToDate.length) {
            return null
        }
        else {
            return portfoliosToDate[portfoliosToDate.length -1]
        }
    })
    return portfoliosAtTime
})

var data = data1.map(d => {
    var ps = d.filter(a => !!a)
    if (ps.length == 0)
        return null

    return ps.reduce((b, acc) => {
        acc[1] += b[1]
        return acc
    })
})

data = data.map(d => {
    if (d)
        d[1] = Math.abs(d[1])
    return d
})

$('#portfolio-value-history').highcharts('StockChart', {


    rangeSelector: {
        selected: 1,
        inputEnabled: $('#container').width() > 480
    },

    title: {
        text: 'Value History',
    },

    series: [{
        name: 'Portfolio Value (BTC)',
        data,
        marker: {
            enabled: false,
            radius: 3
        },
        shadow: true,
        tooltip: {
            valueDecimals: 2
        }
    }]
});
