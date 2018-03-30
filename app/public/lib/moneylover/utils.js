/*
	Money Lover
	Utils
*/


var MLAmountFormatter = function MLAmountFormatter(amount, formatter) {
	return numeral(amount).format(formatter);
};

var MLAmountUnFormatter = function MLAmountUnFormatter(amount) {
	if(amount === 0) return amount;
	else return numeral().unformat(amount);
};

var MLAmountFormatter2 = function(amount, formatter){
	amount = accounting.unformat(amount, formatter.decimal);
	return accounting.formatMoney(amount, formatter);
};

var MLAmountUnFormatter2 = function(amount, formatter){
	return accounting.unformat(amount, formatter.decimal);
}

var generateAmountFormatter = function(currency, settings){
	var formatList			= ['%s%v', '%v%s'],
		zeroFormat			= ['%s0', '0%s'],
		decimalSeparator	= [{decimal: '.', thousand: ','},{decimal: ',', thousand: '.'}],
		symbol				= currency.s,
		format				= formatList[currency.t],
		zero				= zeroFormat[currency.t],
		decimal				= decimalSeparator[settings.decimalSeparator].decimal,
		thousand			= decimalSeparator[settings.decimalSeparator].thousand,
		formatter			= {
			symbol: '',
			format: { pos: format, zero: zero }
		};
	if(settings.showCurrency) formatter.symbol = symbol;
	if(settings.negativeStyle === 1) formatter.format.neg = '-' + format;
	if(settings.negativeStyle === 2) formatter.format.neg = '(' + format + ')';
	if(settings.isShorten) formatter.format.isShorten = true;
	return formatter;
};

var progressCategoryData = function(data){
	var list = [];
	var newData = data;
	if(data.length === 0) return list;

	var listSub = {};

	newData.forEach(function(category, index){
		if(category.parent) {
			if(!listSub[category.parent]) listSub[category.parent] = [];
			listSub[category.parent].push(category);
		}
	});

	data.forEach(function(category){
		if(!category.parent) {
			if(listSub[category._id]){
				category.child = listSub[category._id];
			}
			list.push(category);
		}
	});

	return list;
};

var progressTransactionDataByDate = function(data){
	var tempDate;
	var list = [];
	var indexList = -1;

	data.forEach(function(item){
		var transactionDate = moment(item.displayDate).format('YYYY-MM-DD');

		if(!tempDate || transactionDate !== tempDate) {
			list.push({displayDate: transactionDate, data: [], amount: 0});
			tempDate = transactionDate;
			indexList += 1;
		}
		var amount = item.amount;
		if(item.category.type === 2) amount *= -1;
		list[indexList].amount += amount;
		list[indexList].data.push(item);
	});

	return list;
};