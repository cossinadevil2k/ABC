var DatetimeUtils = function(date_settings) {

    if ( DatetimeUtils.prototype._singletonInstance ) {
      return DatetimeUtils.prototype._singletonInstance;
    }
    DatetimeUtils.prototype._singletonInstance = this;
    this.date_settings = date_settings;
    this.DBFORMAT  = 'YYYY-MM-DD';
    this.seperateChar = ' - ';

	this.todayString = moment().format(this.DBFORMAT);
	this.yesterdayString = moment().subtract('days', 1).format(this.DBFORMAT);
	this.tomorrowString = moment().add('days', 1).format(this.DBFORMAT);

	this.MLFriendlyDateRange = function(start_date, end_date, dateFormat, date_mode){
		var obj = {};
		switch(date_mode){
			case 'day':
				obj = this.MLFriendlyDate(start_date,dateFormat);
				break;
			case 'week':
				obj = this.MLFriendlyWeek(start_date, end_date, dateFormat);
				break;
			case 'month':
				obj = this.MLFriendlyMonth(start_date);
				break;
			case 'quarter':
				obj = this.MLFriendlyQuarter(start_date)
				break;
			case 'year':
				obj = this.MLFriendlyYear(start_date);
				break;
			default:
				obj = {isFriendly: false, date: '', friendlyDate: ''};
				obj.date = this.MLFormatDate(start_date, dateFormat) + this.seperateChar + this.MLFormatDate(end_date, dateFormat);	
		}

		return obj;
	};

	this.MLFriendlyYear = function(start_date){
		var obj = {isFriendly: false, date: '', friendlyDate: ''};
		
		switch(start_date){
			case this.firstDayOfCurrentYear:
				obj.isFriendly = true;
				obj.friendlyDate = 'thisyear';
				break;
			case this.firstDayOfPreviousYear:
				obj.isFriendly = true;
				obj.friendlyDate = 'lastyear';
				break;
			case this.firstDayOfNextYear:
				obj.isFriendly = true;
				obj.friendlyDate = 'nextyear';
				break;
			default:
				obj.date = moment(start_date, this.DBFORMAT).format('YYYY');
		}

		return obj;
	};

	this.MLFriendlyQuarter = function(start_date){
		var obj = {isFriendly: false, date: '', friendlyDate: ''};
		
		switch(start_date){
			case this.firstDayOfCurrentQuarter:
				obj.isFriendly = true;
				obj.friendlyDate = 'thisquarter';
				break;
			case this.firstDayOfPreviousQuarter:
				obj.isFriendly = true;
				obj.friendlyDate = 'lastquarter';
				break;
			case this.firstDayOfNextQuarter:
				obj.isFriendly = true;
				obj.friendlyDate = 'nextquarter';
				break;
			default:
				obj.date = moment(start_date, this.DBFORMAT).format('Q - YYYY');
		}

		return obj;
	};

	this.MLFriendlyMonth = function(start_date){
		var obj = {isFriendly: false, date: '', friendlyDate: ''};
		
		switch(start_date){
			case this.firstDayOfCurrentMonth:
				obj.isFriendly = true;
				obj.friendlyDate = 'thismonth';
				break;
			case this.firstDayOfPreviousMonth:
				obj.isFriendly = true;
				obj.friendlyDate = 'lastmonth';
				break;
			case this.firstDayOfNextMonth:
				obj.isFriendly = true;
				obj.friendlyDate = 'nextmonth';
				break;
			default:
				obj.date = moment(start_date, this.DBFORMAT).format('MM - YYYY');
		}

		return obj;
	};

	this.MLFriendlyWeek = function(start_date, end_date, dateFormat){
		var obj = {isFriendly: false, date: '', friendlyDate: ''};
		switch(start_date){
			case this.firstDayOfCurrentWeek:
				obj.isFriendly = true;
				obj.friendlyDate = 'thisweek';
				break;
			case this.firstDayOfPreviousWeek:
				obj.isFriendly = true;
				obj.friendlyDate = 'lastweek';
				break;
			case this.firstDayOfNextWeek:
				obj.isFriendly = true;
				obj.friendlyDate = 'nextweek';
				break;
			default:
				obj.date = MLFormatDate(start_date, dateFormat) + this.seperateChar + MLFormatDate(end_date, dateFormat);
		}

		return obj;
	};

	this.MLFriendlyDate = function MLFriendlyDate (dateDB, dateFormat) {
		var obj = {isFriendly: false, date: '', friendlyDate: ''};

		switch(dateDB){
			case this.todayString:
				obj.isFriendly = true;
				obj.friendlyDate = 'today';
				break;
			case this.yesterdayString:
				obj.isFriendly = true;
				obj.friendlyDate = 'yesterday';
				break;
			case this.tomorrowString:
				obj.isFriendly = true;
				obj.friendlyDate = 'tomorrow';
				break;
		}

		obj.date = this.MLFormatDate(dateDB, dateFormat);

		return obj;
	};

	this.MLFormatDate = function(date, dateFormat) {
		return moment(date, this.DBFORMAT).format(dateFormat);
	};


	this.calcNextDate = function(start_date, date_mode, date_settings){
		var data = {};
		switch(date_mode){
			case 'day':
				data.start_date = this.addDay(start_date, 1);
				data.end_date = data.start_date;
				break;
			case 'week':
				start_date = moment(start_date, this.DBFORMAT).add('week', 1).format(this.DBFORMAT);
				data.start_date = this.calcFirstDayOfWeek(start_date);
				data.end_date = this.addDay(data.start_date, 6);
				break;
			case 'month':
				start_date = moment(start_date, this.DBFORMAT).add('month', 1).format(this.DBFORMAT);
				data.start_date = this.calcFirstDayOfMonth(start_date, date_settings);
				data.end_date = this.calcEndDayOfMonth(data.start_date);
				break;
			case 'quarter':
				start_date = moment(start_date, this.DBFORMAT).add('quarter', 1).format(this.DBFORMAT);
				data.start_date = this.calcFirstDayOfQuarter(start_date, date_settings);
				date.end_date = this.calcEndDayOfQuarter(data.start_date);
				break;
			case 'year':
				start_date = moment(start_date, this.DBFORMAT).add('year', 1).format(this.DBFORMAT);
				data.start_date = this.calcFirstDayOfYear(start_date, date_settings);
				data.end_date = this.calcEndDayOfYear(data.start_date);
				break;
		}

		return data;
	};


	this.calcPreviousDate = function(start_date, date_mode, date_settings){
		var data = {};
		switch(date_mode){
			case 'day':
				data.start_date = this.subtractDay(start_date, 1);
				data.end_date = data.start_date;
				break;
			case 'week':
				start_date = moment(start_date, this.DBFORMAT).subtract('week', 1).format(this.DBFORMAT);
				data.start_date = this.calcFirstDayOfWeek(start_date);
				data.end_date = this.addDay(data.start_date, 6);
				break;
			case 'month':
				start_date = moment(start_date, this.DBFORMAT).subtract('month', 1).format(this.DBFORMAT);
				data.start_date = this.calcFirstDayOfMonth(start_date, date_settings);
				data.end_date = this.calcEndDayOfMonth(data.start_date);
				break;
			case 'quarter':
				start_date = moment(start_date, this.DBFORMAT).subtract('quarter', 1).format(this.DBFORMAT);
				data.start_date = this.calcFirstDayOfQuarter(start_date, date_settings);
				date.end_date = this.calcEndDayOfQuarter(data.start_date);
				break;
			case 'year':
				start_date = moment(start_date, this.DBFORMAT).subtract('year', 1).format(this.DBFORMAT);
				data.start_date = this.calcFirstDayOfYear(start_date, date_settings);
				data.end_date = this.calcEndDayOfYear(data.start_date);
				break;
		}

		return data;
	};

	this.calcFirstDayOfQuarter = function(start_date, date_settings){
		var month = moment(start_date, this.DBFORMAT).month();
		month = Math.floor(month / 3) + 1;
		return moment(start_date, this.DBFORMAT).date(date_settings.firstDayOfMonth).month(month).format(this.DBFORMAT);
	};

	this.calcEndDayOfQuarter = function(start_date) {
		return moment(start_date, this.DBFORMAT).add('month', 3).subtract('day', 1).format(this.DBFORMAT);
	};


	this.calcFirstDayOfYear = function(start_date, date_settings) {
		return moment(start_date, this.DBFORMAT).date(date_settings.firstDayOfMonth).month(1).format(this.DBFORMAT);
	};

	this.calcEndDayOfYear = function(start_date) {
		return moment(start_date, this.DBFORMAT).add('year', 1).subtract('day', 1).format(this.DBFORMAT);
	};

	this.calcFirstDayOfMonth = function(start_date, date_settings) {
		return moment(start_date, this.DBFORMAT).date(date_settings.firstDayOfMonth).format(this.DBFORMAT);
	};

	this.calcEndDayOfMonth = function(start_date) {
		return moment(start_date, this.DBFORMAT).add('month', 1).subtract('day', 1).format(this.DBFORMAT);
	};

	this.calcFirstDayOfWeek = function(start_date) {
		return moment(start_date, this.DBFORMAT).startOf('week').format(this.DBFORMAT);
	};
	this.addDay = function(start_date, num) {
		return moment(start_date, this.DBFORMAT).add('days', num).format(this.DBFORMAT);
	};

	this.subtractDay = function(start_date, num) {
		return moment(start_date, this.DBFORMAT).subtract('days', num).format(this.DBFORMAT);
	};

	this.addMonth = function(start_date, num) {
		return moment(start_date, this.DBFORMAT).add('month', num).format(this.DBFORMAT);
	};

	this.subtractMonth = function(start_date, num) {
		return moment(start_date, this.DBFORMAT).subtract('month', num).format(this.DBFORMAT);
	};

	this.addYear = function(start_date, num) {
		return moment(start_date, this.DBFORMAT).add('year', num).format(this.DBFORMAT);
	};

	this.subtractYear = function(start_date, num) {
		return moment(start_date, this.DBFORMAT).subtract('year', num).format(this.DBFORMAT);
	};

	this.firstDayOfCurrentWeek = this.calcFirstDayOfWeek(this.todayString);
	this.firstDayOfNextWeek = this.addDay(this.firstDayOfCurrentWeek, 7);
	this.firstDayOfPreviousWeek = this.subtractDay(this.firstDayOfCurrentWeek, 7);

	this.firstDayOfCurrentMonth = this.calcFirstDayOfMonth(this.todayString, this.date_settings);
	this.firstDayOfNextMonth = this.addMonth(this.firstDayOfCurrentMonth, 1);
	this.firstDayOfPreviousMonth = this.subtractMonth(this.calcFirstDayOfMonth, 1);

	this.firstDayOfCurrentQuarter = this.calcFirstDayOfQuarter(this.todayString, this.date_settings);
	this.firstDayOfNextQuarter = this.addMonth(this.firstDayOfCurrentQuarter, 3);
	this.firstDayOfPreviousQuarter = this.subtractMonth(this.firstDayOfCurrentQuarter, 3);

	this.firstDayOfCurrentYear = this.calcFirstDayOfYear(this.todayString, this.date_settings);
	this.firstDayOfNextYear = this.addYear(this.firstDayOfCurrentYear, 1);
	this.firstDayOfPreviousYear = this.subtractYear(this.firstDayOfCurrentYear, 1);
};