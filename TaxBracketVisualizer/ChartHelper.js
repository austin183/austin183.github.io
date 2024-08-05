function getChartHelper(){
    return {
        buildInitialChartDataset : function(label, color, yAxisId, includeBorderDash){
            var dataset = {
                label: label,
                backgroundColor: color,
                borderColor: color,
                data: [
                ],
                fill: false,
                yAxisID: yAxisId
            };
            if (includeBorderDash) {
                dataset.borderDash = [5, 5];
            }

            return dataset;
        },
        buildChartAxisDefinition: function(labelString, id, position, drawOnChartArea, tickCallBackFn){
            return {
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: labelString
                },
                id: id,
                position: position,
                gridLines: {
                    drawOnChartArea: drawOnChartArea
                },
                ticks: {
                    callback: tickCallBackFn
                }
            }
        },
        buildInitialChartConfigOptions: function(buildTooltipLabel){
            return {
                responsive: true,
                maintainAspectRatio: false,
                title: {
                    display: true,
                    text: 'Income'
                },
                tooltips: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: buildTooltipLabel
                    }
                },
                hover: {
                    mode: 'nearest',
                    intersect: true
                },
                scales: {
                    xAxes: [],
                    yAxes: []
                }
            };
        }
    };
}