function getPlotlyHelper() {
    return {
        getPlotlyLayout: function (title) {
            return {
                title: title,
                autosize: false,
                width: 600,
                height: 600,
                margin: {
                    l: 0,
                    r: 0,
                    b: 0,
                    t: 65
                }
            };
        }
    };
}