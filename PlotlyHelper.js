function getPlotlyHelper() {
    return {
        getPlotlyLayout: function (title) {
            return {
                title: title,
                scene: {
                    xaxis: {
                        title: {
                            text: 'Income'
                        }
                    },
                    yaxis: {
                        title: {
                            text: 'Year'
                        }
                    },
                    zaxis: {
                        title: {
                            text: 'EffectiveRate'
                        }
                    }
                },
                autosize: true,
                width: 600,
                height: 600,
                margin: {
                    l: 0,
                    r: 0,
                    b: 0,
                    t: 65
                }
            };
        },
        getInitialPlotlyRow: function(){
            return {
                "x": [],
                "y": [],
                "z": [],
                "opacity": 0.9,
                "mode": "markers",
                "type": "scatter3d",
                "name": "",
                marker: {
                    size: 4,
                    color: [],
                    colorscale:"Jet",
                    cmin: -20,
                    cmax: 50
                },
                hovertemplate:
                "Income: %{x}<br />" +
                "EffectiveRate: %{z}%<br />" +
                "Year: %{y}"
            };
        }
    };
}