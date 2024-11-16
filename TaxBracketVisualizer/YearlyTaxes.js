function getDefaultTaxYear(){
    return this.getTaxYears().Single2022;
}

function getSingleTaxPayerDefinitionKeys() {
    var taxYearDefinitions = getTaxYears();
    var taxYearProperties = [];
    for (taxYearProperty in taxYearDefinitions) {
        if (taxYearProperty.includes("Single")) {
            taxYearProperties.push(taxYearProperty);
        }
    }
    taxYearProperties.sort();
    return taxYearProperties;
}

function getTaxYears() {
    return {
        "Single1970": {
            "standardDeduction": 1100,
            "brackets": [
                {
                "taxRate": 14.0,
                "bracketMax": 500
                },
                {
                "taxRate": 15.0,
                "bracketMax": 1000
                },
                {
                "taxRate": 16.0,
                "bracketMax": 1500
                },
                {
                "taxRate": 17.0,
                "bracketMax": 2000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 4000
                },
                {
                "taxRate": 22.0,
                "bracketMax": 6000
                },
                {
                "taxRate": 25.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 28.0,
                "bracketMax": 10000
                },
                {
                "taxRate": 32.0,
                "bracketMax": 12000
                },
                {
                "taxRate": 36.0,
                "bracketMax": 14000
                },
                {
                "taxRate": 39.0,
                "bracketMax": 16000
                },
                {
                "taxRate": 42.0,
                "bracketMax": 18000
                },
                {
                "taxRate": 45.0,
                "bracketMax": 20000
                },
                {
                "taxRate": 48.0,
                "bracketMax": 22000
                },
                {
                "taxRate": 50.0,
                "bracketMax": 26000
                },
                {
                "taxRate": 53.0,
                "bracketMax": 32000
                },
                {
                "taxRate": 55.0,
                "bracketMax": 38000
                },
                {
                "taxRate": 58.0,
                "bracketMax": 44000
                },
                {
                "taxRate": 60.0,
                "bracketMax": 50000
                },
                {
                "taxRate": 62.0,
                "bracketMax": 60000
                },
                {
                "taxRate": 64.0,
                "bracketMax": 70000
                },
                {
                "taxRate": 66.0,
                "bracketMax": 80000
                },
                {
                    "taxRate": 68.0,
                    "bracketMax": 90000
                },
                {
                "taxRate": 69.0,
                "bracketMax": 100000
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1971": {
            "standardDeduction": 1050,
            "brackets": [
                {
                "taxRate": 14.0,
                "bracketMax": 500
                },
                {
                "taxRate": 15.0,
                "bracketMax": 1000
                },
                {
                "taxRate": 16.0,
                "bracketMax": 1500
                },
                {
                "taxRate": 17.0,
                "bracketMax": 2000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 4000
                },
                {
                "taxRate": 22.0,
                "bracketMax": 6000
                },
                {
                "taxRate": 25.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 28.0,
                "bracketMax": 10000
                },
                {
                "taxRate": 32.0,
                "bracketMax": 12000
                },
                {
                "taxRate": 36.0,
                "bracketMax": 14000
                },
                {
                "taxRate": 39.0,
                "bracketMax": 16000
                },
                {
                "taxRate": 42.0,
                "bracketMax": 18000
                },
                {
                "taxRate": 45.0,
                "bracketMax": 20000
                },
                {
                "taxRate": 48.0,
                "bracketMax": 22000
                },
                {
                "taxRate": 50.0,
                "bracketMax": 26000
                },
                {
                "taxRate": 53.0,
                "bracketMax": 32000
                },
                {
                "taxRate": 55.0,
                "bracketMax": 38000
                },
                {
                "taxRate": 58.0,
                "bracketMax": 44000
                },
                {
                "taxRate": 60.0,
                "bracketMax": 50000
                },
                {
                "taxRate": 62.0,
                "bracketMax": 60000
                },
                {
                "taxRate": 64.0,
                "bracketMax": 70000
                },
                {
                "taxRate": 66.0,
                "bracketMax": 80000
                },
                {
                    "taxRate": 68.0,
                    "bracketMax": 90000
                },
                {
                "taxRate": 69.0,
                "bracketMax": 100000
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1972": {
            "standardDeduction": 1300,
            "brackets": [
                {
                "taxRate": 14.0,
                "bracketMax": 500
                },
                {
                "taxRate": 15.0,
                "bracketMax": 1000
                },
                {
                "taxRate": 16.0,
                "bracketMax": 1500
                },
                {
                "taxRate": 17.0,
                "bracketMax": 2000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 4000
                },
                {
                "taxRate": 22.0,
                "bracketMax": 6000
                },
                {
                "taxRate": 25.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 28.0,
                "bracketMax": 10000
                },
                {
                "taxRate": 32.0,
                "bracketMax": 12000
                },
                {
                "taxRate": 36.0,
                "bracketMax": 14000
                },
                {
                "taxRate": 39.0,
                "bracketMax": 16000
                },
                {
                "taxRate": 42.0,
                "bracketMax": 18000
                },
                {
                "taxRate": 45.0,
                "bracketMax": 20000
                },
                {
                "taxRate": 48.0,
                "bracketMax": 22000
                },
                {
                "taxRate": 50.0,
                "bracketMax": 26000
                },
                {
                "taxRate": 53.0,
                "bracketMax": 32000
                },
                {
                "taxRate": 55.0,
                "bracketMax": 38000
                },
                {
                "taxRate": 58.0,
                "bracketMax": 44000
                },
                {
                "taxRate": 60.0,
                "bracketMax": 50000
                },
                {
                "taxRate": 62.0,
                "bracketMax": 60000
                },
                {
                "taxRate": 64.0,
                "bracketMax": 70000
                },
                {
                "taxRate": 66.0,
                "bracketMax": 80000
                },
                {
                    "taxRate": 68.0,
                    "bracketMax": 90000
                },
                {
                "taxRate": 69.0,
                "bracketMax": 100000
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1973": {
            "standardDeduction": 1300,
            "brackets": [
                {
                "taxRate": 14.0,
                "bracketMax": 500
                },
                {
                "taxRate": 15.0,
                "bracketMax": 1000
                },
                {
                "taxRate": 16.0,
                "bracketMax": 1500
                },
                {
                "taxRate": 17.0,
                "bracketMax": 2000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 4000
                },
                {
                "taxRate": 22.0,
                "bracketMax": 6000
                },
                {
                "taxRate": 25.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 28.0,
                "bracketMax": 10000
                },
                {
                "taxRate": 32.0,
                "bracketMax": 12000
                },
                {
                "taxRate": 36.0,
                "bracketMax": 14000
                },
                {
                "taxRate": 39.0,
                "bracketMax": 16000
                },
                {
                "taxRate": 42.0,
                "bracketMax": 18000
                },
                {
                "taxRate": 45.0,
                "bracketMax": 20000
                },
                {
                "taxRate": 48.0,
                "bracketMax": 22000
                },
                {
                "taxRate": 50.0,
                "bracketMax": 26000
                },
                {
                "taxRate": 53.0,
                "bracketMax": 32000
                },
                {
                "taxRate": 55.0,
                "bracketMax": 38000
                },
                {
                "taxRate": 58.0,
                "bracketMax": 44000
                },
                {
                "taxRate": 60.0,
                "bracketMax": 50000
                },
                {
                "taxRate": 62.0,
                "bracketMax": 60000
                },
                {
                "taxRate": 64.0,
                "bracketMax": 70000
                },
                {
                "taxRate": 66.0,
                "bracketMax": 80000
                },
                {
                    "taxRate": 68.0,
                    "bracketMax": 90000
                },
                {
                "taxRate": 69.0,
                "bracketMax": 100000
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1974": {
            "standardDeduction": 1300,
            "brackets": [
                {
                "taxRate": 14.0,
                "bracketMax": 500
                },
                {
                "taxRate": 15.0,
                "bracketMax": 1000
                },
                {
                "taxRate": 16.0,
                "bracketMax": 1500
                },
                {
                "taxRate": 17.0,
                "bracketMax": 2000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 4000
                },
                {
                "taxRate": 22.0,
                "bracketMax": 6000
                },
                {
                "taxRate": 25.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 28.0,
                "bracketMax": 10000
                },
                {
                "taxRate": 32.0,
                "bracketMax": 12000
                },
                {
                "taxRate": 36.0,
                "bracketMax": 14000
                },
                {
                "taxRate": 39.0,
                "bracketMax": 16000
                },
                {
                "taxRate": 42.0,
                "bracketMax": 18000
                },
                {
                "taxRate": 45.0,
                "bracketMax": 20000
                },
                {
                "taxRate": 48.0,
                "bracketMax": 22000
                },
                {
                "taxRate": 50.0,
                "bracketMax": 26000
                },
                {
                "taxRate": 53.0,
                "bracketMax": 32000
                },
                {
                "taxRate": 55.0,
                "bracketMax": 38000
                },
                {
                "taxRate": 58.0,
                "bracketMax": 44000
                },
                {
                "taxRate": 60.0,
                "bracketMax": 50000
                },
                {
                "taxRate": 62.0,
                "bracketMax": 60000
                },
                {
                "taxRate": 64.0,
                "bracketMax": 70000
                },
                {
                "taxRate": 66.0,
                "bracketMax": 80000
                },
                {
                    "taxRate": 68.0,
                    "bracketMax": 90000
                },
                {
                "taxRate": 69.0,
                "bracketMax": 100000
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1975": {
            "standardDeduction": 1600,
            "brackets": [
                {
                "taxRate": 14.0,
                "bracketMax": 500
                },
                {
                "taxRate": 15.0,
                "bracketMax": 1000
                },
                {
                "taxRate": 16.0,
                "bracketMax": 1500
                },
                {
                "taxRate": 17.0,
                "bracketMax": 2000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 4000
                },
                {
                "taxRate": 22.0,
                "bracketMax": 6000
                },
                {
                "taxRate": 25.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 28.0,
                "bracketMax": 10000
                },
                {
                "taxRate": 32.0,
                "bracketMax": 12000
                },
                {
                "taxRate": 36.0,
                "bracketMax": 14000
                },
                {
                "taxRate": 39.0,
                "bracketMax": 16000
                },
                {
                "taxRate": 42.0,
                "bracketMax": 18000
                },
                {
                "taxRate": 45.0,
                "bracketMax": 20000
                },
                {
                "taxRate": 48.0,
                "bracketMax": 22000
                },
                {
                "taxRate": 50.0,
                "bracketMax": 26000
                },
                {
                "taxRate": 53.0,
                "bracketMax": 32000
                },
                {
                "taxRate": 55.0,
                "bracketMax": 38000
                },
                {
                "taxRate": 58.0,
                "bracketMax": 44000
                },
                {
                "taxRate": 60.0,
                "bracketMax": 50000
                },
                {
                "taxRate": 62.0,
                "bracketMax": 60000
                },
                {
                "taxRate": 64.0,
                "bracketMax": 70000
                },
                {
                "taxRate": 66.0,
                "bracketMax": 80000
                },
                {
                    "taxRate": 68.0,
                    "bracketMax": 90000
                },
                {
                "taxRate": 69.0,
                "bracketMax": 100000
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1976": {
            "standardDeduction": 1700,
            "brackets": [
                {
                "taxRate": 14.0,
                "bracketMax": 500
                },
                {
                "taxRate": 15.0,
                "bracketMax": 1000
                },
                {
                "taxRate": 16.0,
                "bracketMax": 1500
                },
                {
                "taxRate": 17.0,
                "bracketMax": 2000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 4000
                },
                {
                "taxRate": 22.0,
                "bracketMax": 6000
                },
                {
                "taxRate": 25.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 28.0,
                "bracketMax": 10000
                },
                {
                "taxRate": 32.0,
                "bracketMax": 12000
                },
                {
                "taxRate": 36.0,
                "bracketMax": 14000
                },
                {
                "taxRate": 39.0,
                "bracketMax": 16000
                },
                {
                "taxRate": 42.0,
                "bracketMax": 18000
                },
                {
                "taxRate": 45.0,
                "bracketMax": 20000
                },
                {
                "taxRate": 48.0,
                "bracketMax": 22000
                },
                {
                "taxRate": 50.0,
                "bracketMax": 26000
                },
                {
                "taxRate": 53.0,
                "bracketMax": 32000
                },
                {
                "taxRate": 55.0,
                "bracketMax": 38000
                },
                {
                "taxRate": 58.0,
                "bracketMax": 44000
                },
                {
                "taxRate": 60.0,
                "bracketMax": 50000
                },
                {
                "taxRate": 62.0,
                "bracketMax": 60000
                },
                {
                "taxRate": 64.0,
                "bracketMax": 70000
                },
                {
                "taxRate": 66.0,
                "bracketMax": 80000
                },
                {
                "taxRate": 69.0,
                "bracketMax": 90000
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1977": {
            "standardDeduction": 2200,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1600
                },
                {
                "taxRate": 14.0,
                "bracketMax": 2100
                },
                {
                "taxRate": 15.0,
                "bracketMax": 2600
                },
                {
                "taxRate": 16.0,
                "bracketMax": 3100
                },
                {
                "taxRate": 17.0,
                "bracketMax": 3600
                },
                {
                "taxRate": 19.0,
                "bracketMax": 5600
                },
                {
                "taxRate": 21.0,
                "bracketMax": 7600
                },
                {
                "taxRate": 24.0,
                "bracketMax": 9500
                },
                {
                "taxRate": 25.0,
                "bracketMax": 11600
                },
                {
                "taxRate": 27.0,
                "bracketMax": 13600
                },
                {
                "taxRate": 29.0,
                "bracketMax": 15600
                },
                {
                "taxRate": 31.0,
                "bracketMax": 17600
                },
                {
                "taxRate": 34.0,
                "bracketMax": 19600
                },
                {
                "taxRate": 36.0,
                "bracketMax": 21600
                },
                {
                "taxRate": 38.0,
                "bracketMax": 23600
                },
                {
                "taxRate": 40.0,
                "bracketMax": 27300
                },
                {
                "taxRate": 45.0,
                "bracketMax": 33600
                },
                {
                "taxRate": 50.0,
                "bracketMax": 39600
                },
                {
                "taxRate": 55.0,
                "bracketMax": 45600
                },
                {
                "taxRate": 60.0,
                "bracketMax": 51600
                },
                {
                "taxRate": 62.0,
                "bracketMax": 61600
                },
                {
                "taxRate": 64.0,
                "bracketMax": 71600
                },
                {
                "taxRate": 66.0,
                "bracketMax": 81600
                },
                {
                "taxRate": 68.0,
                "bracketMax": 91600
                },
                {
                "taxRate": 69.0,
                "bracketMax": 101600
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1978": {
            "standardDeduction": 2200,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1600
                },
                {
                "taxRate": 14.0,
                "bracketMax": 2100
                },
                {
                "taxRate": 15.0,
                "bracketMax": 2600
                },
                {
                "taxRate": 16.0,
                "bracketMax": 3100
                },
                {
                "taxRate": 17.0,
                "bracketMax": 3600
                },
                {
                "taxRate": 19.0,
                "bracketMax": 5600
                },
                {
                "taxRate": 21.0,
                "bracketMax": 7600
                },
                {
                "taxRate": 24.0,
                "bracketMax": 9500
                },
                {
                "taxRate": 25.0,
                "bracketMax": 11600
                },
                {
                "taxRate": 27.0,
                "bracketMax": 13600
                },
                {
                "taxRate": 29.0,
                "bracketMax": 15600
                },
                {
                "taxRate": 31.0,
                "bracketMax": 17600
                },
                {
                "taxRate": 34.0,
                "bracketMax": 19600
                },
                {
                "taxRate": 36.0,
                "bracketMax": 21600
                },
                {
                "taxRate": 38.0,
                "bracketMax": 23600
                },
                {
                "taxRate": 40.0,
                "bracketMax": 27300
                },
                {
                "taxRate": 45.0,
                "bracketMax": 33600
                },
                {
                "taxRate": 50.0,
                "bracketMax": 39600
                },
                {
                "taxRate": 55.0,
                "bracketMax": 45600
                },
                {
                "taxRate": 60.0,
                "bracketMax": 51600
                },
                {
                "taxRate": 62.0,
                "bracketMax": 61600
                },
                {
                "taxRate": 64.0,
                "bracketMax": 71600
                },
                {
                "taxRate": 66.0,
                "bracketMax": 81600
                },
                {
                "taxRate": 68.0,
                "bracketMax": 91600
                },
                {
                "taxRate": 69.0,
                "bracketMax": 101600
                },
                {
                "taxRate": 70.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1979": {
            "standardDeduction": 2300,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1700
                },
                {
                "taxRate": 14.0,
                "bracketMax": 2750
                },
                {
                "taxRate": 16.0,
                "bracketMax": 3800
                },
                {
                "taxRate": 18.0,
                "bracketMax": 5950
                },
                {
                "taxRate": 19.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 21.0,
                "bracketMax": 10100
                },
                {
                "taxRate": 24.0,
                "bracketMax": 12300
                },
                {
                "taxRate": 26.0,
                "bracketMax": 14950
                },
                {
                "taxRate": 30.0,
                "bracketMax": 17600
                },
                {
                "taxRate": 34.0,
                "bracketMax": 22900
                },
                {
                "taxRate": 39.0,
                "bracketMax": 30000
                },
                {
                "taxRate": 44.0,
                "bracketMax": 42800
                },
                {
                "taxRate": 49.0,
                "bracketMax": 54700
                },
                {
                "taxRate": 55.0,
                "bracketMax": 81200
                },
                {
                    "taxRate": 63.0,
                    "bracketMax": 107700
                },
                {
                "taxRate": 68.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1980": {
            "standardDeduction": 2300,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1700
                },
                {
                "taxRate": 14.0,
                "bracketMax": 2750
                },
                {
                "taxRate": 16.0,
                "bracketMax": 3800
                },
                {
                "taxRate": 18.0,
                "bracketMax": 5950
                },
                {
                "taxRate": 19.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 21.0,
                "bracketMax": 10100
                },
                {
                "taxRate": 24.0,
                "bracketMax": 12300
                },
                {
                "taxRate": 26.0,
                "bracketMax": 14950
                },
                {
                "taxRate": 30.0,
                "bracketMax": 17600
                },
                {
                "taxRate": 34.0,
                "bracketMax": 22900
                },
                {
                "taxRate": 39.0,
                "bracketMax": 30000
                },
                {
                "taxRate": 44.0,
                "bracketMax": 42800
                },
                {
                "taxRate": 49.0,
                "bracketMax": 54700
                },
                {
                "taxRate": 55.0,
                "bracketMax": 81200
                },
                {
                    "taxRate": 63.0,
                    "bracketMax": 107700
                },
                {
                "taxRate": 68.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1981": {
            "standardDeduction": 2300,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1700
                },
                {
                "taxRate": 14.0,
                "bracketMax": 2750
                },
                {
                "taxRate": 16.0,
                "bracketMax": 3800
                },
                {
                "taxRate": 18.0,
                "bracketMax": 5950
                },
                {
                "taxRate": 19.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 21.0,
                "bracketMax": 10100
                },
                {
                "taxRate": 24.0,
                "bracketMax": 12300
                },
                {
                "taxRate": 26.0,
                "bracketMax": 14950
                },
                {
                "taxRate": 30.0,
                "bracketMax": 17600
                },
                {
                "taxRate": 34.0,
                "bracketMax": 22900
                },
                {
                "taxRate": 39.0,
                "bracketMax": 30000
                },
                {
                "taxRate": 44.0,
                "bracketMax": 42800
                },
                {
                "taxRate": 49.0,
                "bracketMax": 54700
                },
                {
                "taxRate": 55.0,
                "bracketMax": 81200
                },
                {
                    "taxRate": 63.0,
                    "bracketMax": 107700
                },
                {
                "taxRate": 68.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1982": {
            "standardDeduction": 2300,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1700
                },
                {
                "taxRate": 12.0,
                "bracketMax": 2750
                },
                {
                "taxRate": 14.0,
                "bracketMax": 3800
                },
                {
                "taxRate": 16.0,
                "bracketMax": 5950
                },
                {
                "taxRate": 17.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 10100
                },
                {
                "taxRate": 22.0,
                "bracketMax": 12300
                },
                {
                "taxRate": 23.0,
                "bracketMax": 14950
                },
                {
                "taxRate": 27.0,
                "bracketMax": 17600
                },
                {
                "taxRate": 31.0,
                "bracketMax": 22900
                },
                {
                "taxRate": 35.0,
                "bracketMax": 30000
                },
                {
                "taxRate": 40.0,
                "bracketMax": 42800
                },
                {
                "taxRate": 44.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
            },
        "Single1983": {
            "standardDeduction": 2300,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1700
                },
                {
                "taxRate": 11.0,
                "bracketMax": 2750
                },
                {
                "taxRate": 13.0,
                "bracketMax": 3800
                },
                {
                "taxRate": 15.0,
                "bracketMax": 5950
                },
                {
                "taxRate": 17.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 19.0,
                "bracketMax": 10100
                },
                {
                "taxRate": 21.0,
                "bracketMax": 12300
                },
                {
                "taxRate": 24.0,
                "bracketMax": 14950
                },
                {
                "taxRate": 28.0,
                "bracketMax": 17600
                },
                {
                "taxRate": 32.0,
                "bracketMax": 22900
                },
                {
                "taxRate": 36.0,
                "bracketMax": 30000
                },
                {
                "taxRate": 40.0,
                "bracketMax": 42800
                },
                {
                "taxRate": 45.0,
                "bracketMax": 54700
                },
                {
                "taxRate": 50.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1984": {
            "standardDeduction": 2300,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1700
                },
                {
                "taxRate": 11.0,
                "bracketMax": 2750
                },
                {
                "taxRate": 12.0,
                "bracketMax": 3800
                },
                {
                "taxRate": 14.0,
                "bracketMax": 5950
                },
                {
                "taxRate": 15.0,
                "bracketMax": 8000
                },
                {
                "taxRate": 16.0,
                "bracketMax": 10100
                },
                {
                "taxRate": 18.0,
                "bracketMax": 12300
                },
                {
                "taxRate": 20.0,
                "bracketMax": 14950
                },
                {
                "taxRate": 23.0,
                "bracketMax": 17600
                },
                {
                "taxRate": 26.0,
                "bracketMax": 22900
                },
                {
                "taxRate": 30.0,
                "bracketMax": 30000
                },
                {
                "taxRate": 34.0,
                "bracketMax": 42800
                },
                {
                "taxRate": 38.0,
                "bracketMax": 54700
                },
                {
                "taxRate": 42.0,
                "bracketMax": 81200
                },
                {
                "taxRate": 48.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1985": {
            "standardDeduction": 2400,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1770
                },
                {
                "taxRate": 11.0,
                "bracketMax": 2860
                },
                {
                "taxRate": 12.0,
                "bracketMax": 3955
                },
                {
                "taxRate": 14.0,
                "bracketMax": 6195
                },
                {
                "taxRate": 15.0,
                "bracketMax": 8325
                },
                {
                "taxRate": 16.0,
                "bracketMax": 10510
                },
                {
                "taxRate": 18.0,
                "bracketMax": 12800
                },
                {
                "taxRate": 20.0,
                "bracketMax": 15560
                },
                {
                "taxRate": 23.0,
                "bracketMax": 18315
                },
                {
                "taxRate": 26.0,
                "bracketMax": 23835
                },
                {
                "taxRate": 30.0,
                "bracketMax": 31225
                },
                {
                "taxRate": 34.0,
                "bracketMax": 44545
                },
                {
                "taxRate": 38.0,
                "bracketMax": 56930
                },
                {
                "taxRate": 42.0,
                "bracketMax": 84510
                },
                {
                "taxRate": 48.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1986": {
            "standardDeduction": 2480,
            "brackets": [
                {
                "taxRate": 0.0,
                "bracketMax": 1835
                },
                {
                "taxRate": 11.0,
                "bracketMax": 2970
                },
                {
                "taxRate": 12.0,
                "bracketMax": 4100
                },
                {
                "taxRate": 14.0,
                "bracketMax": 6420
                },
                {
                "taxRate": 15.0,
                "bracketMax": 8635
                },
                {
                "taxRate": 16.0,
                "bracketMax": 10900
                },
                {
                "taxRate": 18.0,
                "bracketMax": 13275
                },
                {
                "taxRate": 20.0,
                "bracketMax": 16135
                },
                {
                "taxRate": 23.0,
                "bracketMax": 18990
                },
                {
                "taxRate": 26.0,
                "bracketMax": 24710
                },
                {
                "taxRate": 30.0,
                "bracketMax": 32375
                },
                {
                "taxRate": 34.0,
                "bracketMax": 46185
                },
                {
                "taxRate": 38.0,
                "bracketMax": 59025
                },
                {
                "taxRate": 42.0,
                "bracketMax": 87625
                },
                {
                "taxRate": 48.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1987": {
            "standardDeduction": 2540,
            "brackets": [
              {
                "taxRate": 11.0,
                "bracketMax": 1500
              },
              {
                "taxRate": 15.0,
                "bracketMax": 14000
              },
              {
                "taxRate": 28.0,
                "bracketMax": 22500
              },
              {
                "taxRate": 35.0,
                "bracketMax": 45000
              },
              {
                "taxRate": 38.5,
                "bracketMax": Number.MAX_SAFE_INTEGER
              }
            ]
          },
        "Single1988": {
            "standardDeduction": 3000,
            "brackets": [
            {
                "taxRate": 15.0,
                "bracketMax": 14875
            },
            {
                "taxRate": 28.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
            }
            ]
        },
        "Single1989": {
            "standardDeduction": 3100,
            "brackets": [
            {
                "taxRate": 15.0,
                "bracketMax": 15475
            },
            {
                "taxRate": 28.0,
                "bracketMax": Number.MAX_SAFE_INTEGER
            }
            ]
        },
        "Single1990": {
            "standardDeduction": 3250,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 16225
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1991": {
            "standardDeduction": 3400,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 17000
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 41075
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1992": {
            "standardDeduction": 3600,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 17900
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 43250
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1993": {
            "standardDeduction": 3700,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 18450
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 44575
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": 70000
                },
                {
                    "taxRate": 36.0,
                    "bracketMax": 125000
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1994": {
            "standardDeduction": 3800,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 19000
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 45925
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": 70000
                },
                {
                    "taxRate": 36.0,
                    "bracketMax": 125000
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1995": {
            "standardDeduction": 3900,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 19500
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 47125
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": 71800
                },
                {
                    "taxRate": 36.0,
                    "bracketMax": 128250
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1996": {
            "standardDeduction": 4000,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 20050
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 48450
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": 73850
                },
                {
                    "taxRate": 36.0,
                    "bracketMax": 131875
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1997": {
            "standardDeduction": 4150,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 20600
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 49800
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": 75875
                },
                {
                    "taxRate": 36.0,
                    "bracketMax": 135525
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1998": {
            "standardDeduction": 4250,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 21175
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 51150
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": 77975
                },
                {
                    "taxRate": 36.0,
                    "bracketMax": 139225
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single1999": {
            "standardDeduction": 4300,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 21525
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 52025
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": 79275
                },
                {
                    "taxRate": 36.0,
                    "bracketMax": 141575
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2000": {
            "standardDeduction": 4400,
            "brackets": [
                {
                    "taxRate": 15.0,
                    "bracketMax": 21925
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 52975
                },
                {
                    "taxRate": 31.0,
                    "bracketMax": 80725
                },
                {
                    "taxRate": 36.0,
                    "bracketMax": 144175
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2001": {
            "standardDeduction": 4550,
            "brackets": [
                {
                  "taxRate": 15.0,
                  "bracketMax": 22600
                },
                {
                  "taxRate": 27.5,
                  "bracketMax": 54625
                },
                {
                  "taxRate": 30.5,
                  "bracketMax": 83250
                },
                {
                  "taxRate": 35.5,
                  "bracketMax": 148675
                },
                {
                  "taxRate": 39.1,
                  "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2002": {
            "standardDeduction": 4700,
            "brackets": [
                {
                    "taxRate": 10.0,
                    "bracketMax": 6000
                },
                {
                    "taxRate": 15.0,
                    "bracketMax": 23350
                },
                {
                    "taxRate": 27.0,
                    "bracketMax": 56425
                },
                {
                    "taxRate": 30.0,
                    "bracketMax": 85975
                },
                {
                    "taxRate": 35.0,
                    "bracketMax": 153525
                },
                {
                    "taxRate": 38.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2003": {
            "standardDeduction": 4750,
            "brackets": [
                {
                    "taxRate": 10.0,
                    "bracketMax": 7000
                },
                {
                    "taxRate": 15.0,
                    "bracketMax": 23725
                },
                {
                    "taxRate": 25.0,
                    "bracketMax": 57325
                },
                {
                    "taxRate": 28.0,
                    "bracketMax": 87350
                },
                {
                    "taxRate": 33.0,
                    "bracketMax": 155975
                },
                {
                    "taxRate": 35.0,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2004": {
            "standardDeduction": 4850,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 7150
                },
                {
                    "taxRate": 15,
                    "bracketMax": 29050
                },
                {
                    "taxRate": 25,
                    "bracketMax": 58625
                },
                {
                    "taxRate": 28,
                    "bracketMax": 89325
                },
                {
                    "taxRate": 33,
                    "bracketMax": 159550
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2005": {
            "standardDeduction": 5000,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 7300
                },
                {
                    "taxRate": 15,
                    "bracketMax": 29700
                },
                {
                    "taxRate": 25,
                    "bracketMax": 59975
                },
                {
                    "taxRate": 28,
                    "bracketMax": 91400
                },
                {
                    "taxRate": 33,
                    "bracketMax": 163225
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2006": {
            "standardDeduction": 5150,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 7550
                },
                {
                    "taxRate": 15,
                    "bracketMax": 30650
                },
                {
                    "taxRate": 25,
                    "bracketMax": 74200
                },
                {
                    "taxRate": 28,
                    "bracketMax": 154800
                },
                {
                    "taxRate": 33,
                    "bracketMax": 336550
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2007": {
            "standardDeduction": 5350,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 7825
                },
                {
                    "taxRate": 15,
                    "bracketMax": 31850
                },
                {
                    "taxRate": 25,
                    "bracketMax": 77100
                },
                {
                    "taxRate": 28,
                    "bracketMax": 160850
                },
                {
                    "taxRate": 33,
                    "bracketMax": 349700
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2008": {
            "standardDeduction": 5450,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 8025
                },
                {
                    "taxRate": 15,
                    "bracketMax": 32550
                },
                {
                    "taxRate": 25,
                    "bracketMax": 78850
                },
                {
                    "taxRate": 28,
                    "bracketMax": 164550
                },
                {
                    "taxRate": 33,
                    "bracketMax": 357700
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2009": {
            "standardDeduction": 5700,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 8350
                },
                {
                    "taxRate": 15,
                    "bracketMax": 33950
                },
                {
                    "taxRate": 25,
                    "bracketMax": 82250
                },
                {
                    "taxRate": 28,
                    "bracketMax": 171550
                },
                {
                    "taxRate": 33,
                    "bracketMax": 372950
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2010": {
            "standardDeduction": 5700,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 8375
                },
                {
                    "taxRate": 15,
                    "bracketMax": 34000
                },
                {
                    "taxRate": 25,
                    "bracketMax": 82400
                },
                {
                    "taxRate": 28,
                    "bracketMax": 171850
                },
                {
                    "taxRate": 33,
                    "bracketMax": 373650
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2011": {
            "standardDeduction": 5800,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 8500
                },
                {
                    "taxRate": 15,
                    "bracketMax": 34500
                },
                {
                    "taxRate": 25,
                    "bracketMax": 83600
                },
                {
                    "taxRate": 28,
                    "bracketMax": 174400
                },
                {
                    "taxRate": 33,
                    "bracketMax": 379150
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2012": {
            "standardDeduction": 5950,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 8700
                },
                {
                    "taxRate": 15,
                    "bracketMax": 35350
                },
                {
                    "taxRate": 25,
                    "bracketMax": 85650
                },
                {
                    "taxRate": 28,
                    "bracketMax": 178650
                },
                {
                    "taxRate": 33,
                    "bracketMax": 388350
                },
                {
                    "taxRate": 35,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2013": {
            "standardDeduction": 6100,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 8925
                },
                {
                    "taxRate": 15,
                    "bracketMax": 36250
                },
                {
                    "taxRate": 25,
                    "bracketMax": 87850
                },
                {
                    "taxRate": 28,
                    "bracketMax": 183250
                },
                {
                    "taxRate": 33,
                    "bracketMax": 398350
                },
                {
                    "taxRate": 35,
                    "bracketMax": 400000
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2014": {
            "standardDeduction": 6200,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 9075
                },
                {
                    "taxRate": 15,
                    "bracketMax": 36900
                },
                {
                    "taxRate": 25,
                    "bracketMax": 89350
                },
                {
                    "taxRate": 28,
                    "bracketMax": 186350
                },
                {
                    "taxRate": 33,
                    "bracketMax": 405100
                },
                {
                    "taxRate": 35,
                    "bracketMax": 406750
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2015": {
            "standardDeduction": 6300,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 9225
                },
                {
                    "taxRate": 15,
                    "bracketMax": 37450
                },
                {
                    "taxRate": 25,
                    "bracketMax": 90750
                },
                {
                    "taxRate": 28,
                    "bracketMax": 189300
                },
                {
                    "taxRate": 33,
                    "bracketMax": 411500
                },
                {
                    "taxRate": 35,
                    "bracketMax": 413200
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2016": {
            "standardDeduction": 6300,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 9275
                },
                {
                    "taxRate": 15,
                    "bracketMax": 37650
                },
                {
                    "taxRate": 25,
                    "bracketMax": 91150
                },
                {
                    "taxRate": 28,
                    "bracketMax": 191150
                },
                {
                    "taxRate": 33,
                    "bracketMax": 413350
                },
                {
                    "taxRate": 35,
                    "bracketMax": 415050
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2017": {
            "standardDeduction": 6350,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 9325
                },
                {
                    "taxRate": 15,
                    "bracketMax": 37950
                },
                {
                    "taxRate": 25,
                    "bracketMax": 91900
                },
                {
                    "taxRate": 28,
                    "bracketMax": 191650
                },
                {
                    "taxRate": 33,
                    "bracketMax": 416700
                },
                {
                    "taxRate": 35,
                    "bracketMax": 418400
                },
                {
                    "taxRate": 39.6,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2018": {
            "standardDeduction": 12000,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 9525
                },
                {
                    "taxRate": 12,
                    "bracketMax": 38700
                },
                {
                    "taxRate": 22,
                    "bracketMax": 82500
                },
                {
                    "taxRate": 24,
                    "bracketMax": 157500
                },
                {
                    "taxRate": 32,
                    "bracketMax": 200000
                },
                {
                    "taxRate": 35,
                    "bracketMax": 500000
                },
                {
                    "taxRate": 37,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2019": {
            "standardDeduction": 12200,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 9700
                },
                {
                    "taxRate": 12,
                    "bracketMax": 39475
                },
                {
                    "taxRate": 22,
                    "bracketMax": 84200
                },
                {
                    "taxRate": 24,
                    "bracketMax": 160725
                },
                {
                    "taxRate": 32,
                    "bracketMax": 204100
                },
                {
                    "taxRate": 35,
                    "bracketMax": 510300
                },
                {
                    "taxRate": 37,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2020": {
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
        "Single2021": {
            "standardDeduction": 12550,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 9950
                },
                {
                    "taxRate": 12,
                    "bracketMax": 40525
                },
                {
                    "taxRate": 22,
                    "bracketMax": 86375
                },
                {
                    "taxRate": 24,
                    "bracketMax": 164925
                },
                {
                    "taxRate": 32,
                    "bracketMax": 209425
                },
                {
                    "taxRate": 35,
                    "bracketMax": 523600
                },
                {
                    "taxRate": 37,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        },
        "Single2022": {
            "standardDeduction": 12950,
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
        },
        "Single2023": {
            "standardDeduction": 13850,
            "brackets": [
                {
                    "taxRate": 10,
                    "bracketMax": 11000
                },
                {
                    "taxRate": 12,
                    "bracketMax": 44725
                },
                {
                    "taxRate": 22,
                    "bracketMax": 95375
                },
                {
                    "taxRate": 24,
                    "bracketMax": 182100
                },
                {
                    "taxRate": 32,
                    "bracketMax": 231250
                },
                {
                    "taxRate": 35,
                    "bracketMax": 578125
                },
                {
                    "taxRate": 37,
                    "bracketMax": Number.MAX_SAFE_INTEGER
                }
            ]
        }

    };
}