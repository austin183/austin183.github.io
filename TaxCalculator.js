function getTaxCalculator(){
    var getPercentage = function(value){
        return (value * .01).toFixed(2);
    };
    var getBreakDownComponent = function(income, item, minimumAmount){
        var component = {
            bracket: item.bracketMax,
            max: 0,
            taxRate: item.taxRate,
            taxAmount: 0
        };
        if (income > item.bracketMax) {
            component.taxAmount = ((item.bracketMax - minimumAmount) * getPercentage(item.taxRate));
            component.max = item.bracketMax - minimumAmount;
        }
        else if (income > minimumAmount) {
            component.taxAmount = ((income - minimumAmount) * getPercentage(item.taxRate));
            component.max = income - minimumAmount;
        }
        return component;
    };
    var buildBreakdownComponent = function(income, item, minimumAmount, incomeBreakDown){
        var component = getBreakDownComponent(income, item, minimumAmount);
        incomeBreakDown.components.push(component);
    };
    var getTaxableIncome = function(income, deduction) {
        var income = income - deduction;
        if (income < 0) income = 0;
        return income;
    };

    return {
        getTaxInformation: function (income, buildBreakdown, taxBrackets, deduction, incomeBreakDown){
            var taxableIncome = getTaxableIncome(income, deduction);
            var taxAmount = 0;
            var marginalTaxRate = 0;
            var netIncome = 0;
            var previousMax = 0;
            if (buildBreakdown) incomeBreakDown.components = [];
            taxBrackets.forEach(function (item, index) {
                if (buildBreakdown) buildBreakdownComponent(taxableIncome, item, previousMax, incomeBreakDown);
                if (taxableIncome > item.bracketMax) {
                    taxAmount += (item.bracketMax - previousMax) * getPercentage(item.taxRate);
                }
                else if (taxableIncome > previousMax) {
                    taxAmount += (taxableIncome - previousMax) * getPercentage(item.taxRate);
                }
                previousMax = item.bracketMax;
            });
            marginalTaxRate = taxAmount / income;
            netIncome = income - taxAmount;
            return {
                taxAmount: taxAmount.toFixed(2),
                marginalTaxRate: marginalTaxRate.toFixed(4),
                netIncome: netIncome.toFixed(2)
            };
        }
    };
}