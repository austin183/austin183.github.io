function getChartHelper(){
    return {
        buildInitialDataset : function(label, color, yAxisId, includeBorderDash){
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
        }
    };
}