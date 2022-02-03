function getTaxYears() {
    return {
        "Single2021": {
            "standardDeduction": 12400,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 9875
                },
                {
                    "taxRate": 12,
                    "bracketMax": 40125
                },
                {
                    "taxRate": 22,
                    "bracketMax": 85525
                },
                {
                    "taxRate": 24,
                    "bracketMax": 163300
                },
                {
                    "taxRate": 32,
                    "bracketMax": 207350
                },
                {
                    "taxRate": 35,
                    "bracketMax": 518400
                },
                {
                    "taxRate": 37,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2022": {
            "standardDeduction": 12400,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 10275
                },
                {
                    "taxRate": 12,
                    "bracketMax": 41775
                },
                {
                    "taxRate": 22,
                    "bracketMax": 89075
                },
                {
                    "taxRate": 24,
                    "bracketMax": 170050
                },
                {
                    "taxRate": 32,
                    "bracketMax": 215950
                },
                {
                    "taxRate": 35,
                    "bracketMax": 539900
                },
                {
                    "taxRate": 37,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        }
    };
}