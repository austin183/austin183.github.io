function getPlotlyHelper() {
    return {
        getPlotlyLayout: function (title) {
            return {
                title: title,
                scene: {
                    aspectmode:'manual',
		            aspectratio: {x:1, y:2, z:1},
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
                margin: {
                    l: 0,
                    r: 0,
                    b: 0,
                    t: 0
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
                    size: 3.2,
                    color: [],
                    colorscale:"Jet",
                    cmin: -15,
                    cmax: 55
                },
                hovertemplate:
                "Income: %{x}<br />" +
                "EffectiveRate: %{z}%<br />" +
                "Year: %{y}"
            };
        }
    };
}