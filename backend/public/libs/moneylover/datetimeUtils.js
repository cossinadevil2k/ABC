var MLFriendlyDateRange = function(start_date, end_date, dateFormat, date_mode){
	var obj = {isFriendly: false, date: '', friendlyDate: ''};
	switch(date_mode){
		case 'day':
			obj = MLFriendlyDate(start_date,dateFormat);
			break;
		case 'week':
			obj = MLFriendlyWeek(start_date, end_date, dateFormat);
			break;
		case 'month':
			break;
		case 'quarter':
			break;
		case 'year':
			break;
	}

	return obj;
};

var MLFriendlyWeek = function(start_date, end_date, dateFormat){
	var obj = {isFriendly: false, date: '', friendlyDate: ''};
	switch(start_date){
		case firstDayOfCurrentWeek:
			obj.isFriendly = true;
			obj.friendlyDate = '';
			break;
		case firstDayOfPreviousWeek:
			obj.isFriendly = true;
			obj.friendlyDate = '';
			break;
		case firstDayOfNextWeek:
			obj.isFriendly = true;
			obj.friendlyDate = '';
			break;
		default:
			obj.date = MLFormatDate(start_date, dateFormat) + ' - ' + MLFormatDate(end_date, dateFormat);
	}

	return obj;
};

var MLFriendlyDate = function MLFriendlyDate (dateDB, dateFormat) {
	var obj = {isFriendly: false, date: '', friendlyDate: ''};

	switch(dateDB){
		case todayString :
			obj.isFriendly = true;
			obj.friendlyDate = 'today';
			break;
		case yesterdayString :
			obj.isFriendly = true;
			obj.friendlyDate = 'yesterday';
			break;
		case tomorrowString :
			obj.isFriendly = true;
			obj.friendlyDate = 'tomorrow';
			break;
	}

	obj.date = MLFormatDate(dateDB, dateFormat);

	return obj;
};

var MLFormatDate = function(date, dateFormat) {
	return moment(date, DBFORMAT).format(dateFormat);
};


var calcNextDate = function(start_date, date_mode, date_settings){
	var data = {};
	switch(date_mode){
		case 'day':
			data.start_date = addDay(start_date, 1);
			data.end_date = data.start_date;
			break;
		case 'week':
			start_date = moment(start_date, DBFORMAT).add(1, 'weeks').format(DBFORMAT);
			data.start_date = calcFirstDayOfWeek(start_date);
			data.end_date = addDay(data.start_date, 6);
			break;
		case 'month':
			start_date = moment(start_date, DBFORMAT).add(1, 'months').format(DBFORMAT);
			data.start_date = calcFirstDayOfMonth(start_date, date_settings);
			data.end_date = calcEndDayOfMonth(data.start_date);
			break;
		case 'quarter':
			start_date = moment(start_date, DBFORMAT).add(1, 'quarters').format(DBFORMAT);
			data.start_date = calcFirstDayOfQuarter(start_date, date_settings);
			date.end_date = calcEndDayOfQuarter(data.start_date);
			break;
		case 'year':
			start_date = moment(start_date, DBFORMAT).add(1, 'years').format(DBFORMAT);
			data.start_date = calcFirstDayOfYear(start_date, date_settings);
			data.end_date = calcEndDayOfYear(data.start_date);
			break;
	}

	return data;
};


var calcPreviousDate = function(start_date, date_mode, date_settings){
	var data = {};
	switch(date_mode){
		case 'day':
			data.start_date = subtractDay(start_date, 1);
			data.end_date = data.start_date;
			break;
		case 'week':
			start_date = moment(start_date, DBFORMAT).subtract(1, 'weeks').format(DBFORMAT);
			data.start_date = calcFirstDayOfWeek(start_date);
			data.end_date = addDay(data.start_date, 6);
			break;
		case 'month':
			start_date = moment(start_date, DBFORMAT).subtract(1, 'months').format(DBFORMAT);
			data.start_date = calcFirstDayOfMonth(start_date, date_settings);
			data.end_date = calcEndDayOfMonth(data.start_date);
			break;
		case 'quarter':
			start_date = moment(start_date, DBFORMAT).subtract(1, 'quarters').format(DBFORMAT);
			data.start_date = calcFirstDayOfQuarter(start_date, date_settings);
			date.end_date = calcEndDayOfQuarter(data.start_date);
			break;
		case 'year':
			start_date = moment(start_date, DBFORMAT).subtract(1, 'years').format(DBFORMAT);
			data.start_date = calcFirstDayOfYear(start_date, date_settings);
			data.end_date = calcEndDayOfYear(data.start_date);
			break;
	}

	return data;
};

var calcFirstDayOfQuarter = function(start_date, date_settings){
	var month = moment(start_date, DBFORMAT).month();
	month = Math.floor(month / 3) + 1;
	return moment(start_date, DBFORMAT).date(date_settings.firstDayOfMonth).month(month).format(DBFORMAT);
};

var calcEndDayOfQuarter = function(start_date) {
	return moment(start_date, DBFORMAT).add(3, 'months').subtract(1, 'days').format(DBFORMAT);
};


var calcFirstDayOfYear = function(start_date, date_settings) {
	return moment(start_date, DBFORMAT).date(date_settings.firstDayOfMonth).month(1).format(DBFORMAT);
};

var calcEndDayOfYear = function(start_date) {
	return moment(start_date, DBFORMAT).add(1, 'years').subtract(1, 'days').format(DBFORMAT);
};

var calcFirstDayOfMonth = function(start_date, date_settings) {
	return moment(start_date, DBFORMAT).date(date_settings.firstDayOfMonth).format(DBFORMAT);
};

var calcEndDayOfMonth = function(start_date) {
	return moment(start_date, DBFORMAT).add(1, 'months').subtract(1, 'days').format(DBFORMAT);
};

var calcFirstDayOfWeek = function(start_date) {
	return moment(start_date, DBFORMAT).startOf('week').format(DBFORMAT);
};

var addDay = function(start_date, num) {
	return moment(start_date, DBFORMAT).add(num, 'days').format(DBFORMAT);
};

var subtractDay = function(start_date, num) {
	return moment(start_date, DBFORMAT).subtract(num, 'days').format(DBFORMAT);
};

var addMonth = function(start_date, num) {
	return moment(start_date, DBFORMAT).add(num, 'months').format(DBFORMAT);
};

var subtractMonth = function(start_date, num) {
	return moment(start_date, DBFORMAT).subtract(num, 'months').format(DBFORMAT);
};

var addYear = function(start_date, num) {
	return moment(start_date, DBFORMAT).add(num, 'years').format(DBFORMAT);
};

var subtractYear = function(start_date, num) {
	return moment(start_date, DBFORMAT).subtract(num, 'years').format(DBFORMAT);
};


var DBFORMAT  = 'YYYY-MM-DD';

var todayString = moment().format(DBFORMAT);
var yesterdayString = moment().subtract(1, 'days').format(DBFORMAT);
var tomorrowString = moment().add(1, 'days').format(DBFORMAT);

var firstDayOfCurrentWeek = calcFirstDayOfWeek(todayString);
var firstDayOfNextWeek = addDay(firstDayOfCurrentWeek, 7);
var firstDayOfPreviousWeek = subtractDay(firstDayOfCurrentWeek, 7);

var firstDayOfCurrentMonth = calcFirstDayOfMonth(todayString);
var firstDayOfNextMonth = addMonth(firstDayOfCurrentMonth, 1);
var firstDayOfPreviousMonth = subtractMonth(calcFirstDayOfMonth, 1);

var firstDayOfCurrentQuarter = calcFirstDayOfQuarter(todayString);
var firstDayOfNextQuarter = addMonth(firstDayOfCurrentQuarter, 3);
var firstDayOfPreviousQuarter = subtractMonth(firstDayOfCurrentQuarter, 3);

var firstDayOfCurrentYear = calcFirstDayOfYear(todayString);
var firstDayOfNextYear = addYear(firstDayOfCurrentYear, 1);
var firstDayOfPreviousYear = subtractYear(firstDayOfCurrentYear, 1);
