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

