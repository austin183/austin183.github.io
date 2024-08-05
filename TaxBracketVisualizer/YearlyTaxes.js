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
        }
    };
}