(function($a) {
	'use strict';
	var deviceOS = [{
		id: 1,
		name: 'Android',
		device: [{
			name: 'Kitkat',
			version: '4.4 - 4.4.2',
			api: 19
		}, {
			name: 'Jelly Bean',
			version: '4.3.x',
			api: 18
		}, {
			name: 'Jelly Bean',
			version: '4.2.x',
			api: 17
		}, {
			name: 'Jelly Bean',
			version: '4.1.x',
			api: 16
		}, {
			name: 'Ice Cream Sandwich',
			version: '4.0.3 - 4.0.4',
			api: 15
		}, {
			name: 'Ice Cream Sandwich',
			version: '4.0.1 - 4.0.2',
			api: 14
		}, {
			name: 'Honeycomb',
			version: '3.2.x',
			api: 13
		}, {
			name: 'Honeycomb',
			version: '3.1',
			api: 12
		}, {
			name: 'Honeycomb',
			version: '3.0',
			api: 11
		}]
	}, {
		id: 2,
		name: 'iOS',
		device: [{
			name: 'Okemo',
			version: '8.0',
			api: 8.0
		},{
			name: 'Sochi',
			version: '7.1',
			api: 7.1
		}, {
			name: 'Innsbruck',
			version: '7.0',
			api: 7.0
		}, {
			name: 'Brighton',
			version: '6.1',
			api: 6.1
		}, {
			name: 'Sundance',
			version: '6.0',
			api: 6.0
		}, {
			name: 'Hoodoo',
			version: '5.1',
			api: 5.1
		}, {
			name: 'Telluride',
			version: '5.0',
			api: 5.0
		}]
	}, {
		id: 3,
		name: 'Winphone'
	}];

	var currencies = [{"c":"USD","s":"$","n":"United States Dollar","t":0,"i":1},{"c":"GBP","s":"£","n":"Pound","t":0,"i":2},{"c":"EUR","s":"€","n":"Euro","t":0,"i":3},{"c":"VND","s":"₫","n":"Việt Nam Đồng","t":1,"i":4},{"c":"CNY","s":"¥","n":"Yuan Renminbi","t":0,"i":5},{"c":"JPY","s":"¥","n":"Yen","t":0,"i":6},{"c":"BRL","s":"R$","n":"Reais","t":0,"i":7},{"c":"RUB","s":"руб","n":"Rubles","t":0,"i":8},{"c":"KRW","s":"₩","n":"Won","t":0,"i":9},{"c":"THB","s":"฿","n":"Baht","t":0,"i":10},{"c":"INR","s":"₹","n":"India Rupee","t":0,"i":11},{"c":"CHF","s":"Fr.","n":"Francs","t":0,"i":12},{"c":"DKK","s":"Kr","n":"Kroner","t":0,"i":13},{"c":"SEK","s":"kr","n":"Sweden Krona","t":0,"i":14},{"c":"PLN","s":"zł","n":"Poland Zlotych","t":0,"i":15},{"c":"HUF","s":"Ft","n":"Hungary Forint","t":0,"i":16},{"c":"NOK","s":"kr","n":"Norwegian krone","t":0,"i":17},{"c":"BYR","s":"BYR","n":"Belarusian ruble","t":0,"i":18},{"c":"DZD","s":"DZD","n":"Algerian Dinar","t":0,"i":19},{"c":"AUD","s":"$","n":"Australia Dollars","t":0,"i":20},{"c":"AZN","s":"ман","n":"Azerbaijan New Manats","t":0,"i":21},{"c":"ARS","s":"$","n":"Argentina Pesos","t":0,"i":22},{"c":"BDT","s":"BDT","n":"Bangladeshi taka","t":0,"i":23},{"c":"BOB","s":"$b","n":"Bolivianos","t":0,"i":24},{"c":"BGN","s":"лв","n":"Bulgarian lev","t":0,"i":25},{"c":"CAD","s":"C$","n":"Canada Dollars","t":0,"i":26},{"c":"CRC","s":"₡","n":"Colon","t":0,"i":27},{"c":"HRK","s":"kn","n":"Croatian kuna","t":0,"i":28},{"c":"CLP","s":"$","n":"Chile Pesos","t":0,"i":29},{"c":"COP","s":"$","n":"Colombia Pesos","t":0,"i":30},{"c":"CZK","s":"Kč","n":"Česká koruna","t":0,"i":31},{"c":"MNT","s":"₮","n":"Tugriks","t":0,"i":32},{"c":"HNL","s":"L","n":"Lempiras","t":0,"i":33},{"c":"MAD","s":"MAD","n":"Moroccan Dirham","t":0,"i":34},{"c":"MXN","s":"$","n":"Mexico Pesos","t":0,"i":35},{"c":"NGN","s":"₦","n":"Nairas","t":0,"i":36},{"c":"NZD","s":"NZ$","n":"New Zealand Dollars","t":0,"i":37},{"c":"HKD","s":"HK$","n":"Hong Kong Dollars","t":0,"i":38},{"c":"LAK","s":"₭","n":"Lao kip","t":0,"i":39},{"c":"KES","s":"KSh","n":"Kenya Shilling","t":0,"i":40},{"c":"DOP","s":"RD$","n":"Dominican Republic Pesos","t":0,"i":41},{"c":"GHS","s":"GH₵","n":"Ghana Cedi","t":0,"i":42},{"c":"ILS","s":"₪","n":"Israel New Shekels","t":0,"i":43},{"c":"IDR","s":"Rp","n":"Indonesia Rupiah","t":0,"i":44},{"c":"IRR","s":"IRR","n":"Iranian Rial","t":0,"i":45},{"c":"JOD","s":"JOD","n":"Jordanian dinar","t":0,"i":46},{"c":"KGS","s":"лв","n":"Kyrgyzstan Soms","t":0,"i":47},{"c":"LVL","s":"Ls","n":"Latvia Lati","t":0,"i":48},{"c":"LTL","s":"Lt","n":"Lithuania Litai","t":0,"i":49},{"c":"MKD","s":"ден","n":"Macedonia Denars","t":0,"i":50},{"c":"MZN","s":"MT","n":"Mozambique Meticais","t":0,"i":51},{"c":"MYR","s":"RM","n":"Malaysia Ringgits","t":0,"i":52},{"c":"ANG","s":"NAƒ","n":"Netherlands Antilles Guilders","t":0,"i":53},{"c":"TWD","s":"NT$","n":"New Taiwan Dollar","t":0,"i":54},{"c":"NIO","s":"C$","n":"Nicaragua Cordobas","t":0,"i":55},{"c":"NPR","s":"NRs","n":"Nepalese Rupee","t":0,"i":56},{"c":"OMR","s":"﷼","n":"Oman Rials","t":0,"i":57},{"c":"PAB","s":"B/.","n":"Panama Balboa","t":0,"i":58},{"c":"PHP","s":"₱","n":"Philippines Pesos","t":0,"i":59},{"c":"PYG","s":"Gs","n":"Paraguay Guarani","t":0,"i":60},{"c":"PEN","s":"S/.","n":"Peru Nuevos Soles","t":0,"i":61},{"c":"QAR","s":"QR","n":"Qatar riyal","t":0,"i":62},{"c":"RON","s":"lei","n":"Romanian Leu","t":0,"i":63},{"c":"TTD","s":"TT$","n":"Trinidad and Tobago Dollars","t":0,"i":64},{"c":"TRY","s":"TL.","n":"Turkish Liras","t":0,"i":65},{"c":"TND","s":"DT","n":"Tunisian dinar","t":0,"i":66},{"c":"UAH","s":"₴","n":"Ukraine Hryvnia","t":0,"i":67},{"c":"UYU","s":"$U","n":"Uruguay Pesos","t":0,"i":68},{"c":"AED","s":"AED","n":"United Arab Emirates dirham","t":0,"i":69},{"c":"VEF","s":"Bs","n":"Venezuela Bolivares Fuertes","t":0,"i":70},{"c":"KZT","s":"T","n":"Kazakhstani tenge","t":0,"i":71},{"c":"RSD","s":"din.","n":"Serbia Dinar","t":0,"i":72},{"c":"SAR","s":"SR","n":"Saudi Arabian Riyal","t":0,"i":73},{"c":"SKK","s":"SKK","n":"Slovak crown","t":0,"i":74},{"c":"ZAR","s":"R","n":"South African rand","t":0,"i":75},{"c":"SGD","s":"S$","n":"Singapore Dollars","t":0,"i":76},{"c":"LKR","s":"Rs","n":"Sri Lanka rupee","t":0,"i":77},{"c":"ZMK","s":"ZK","n":"Zambian kwacha","t":0,"i":78},{"c":"LBP","s":"LBP","n":"Lebanese Pound","t":0,"i":79},{"c":"KWD","s":"K.D","n":"Kuwaiti Dinar","t":0,"i":80},{"t":0,"n":"Afghan afghani","s":"AFN","c":"AFN","i":81},{"t":0,"s":"ALL","c":"ALL","n":"Albanian lek","i":82},{"t":0,"n":"Angolan kwanza","s":"AOA","c":"AOA","i":83},{"t":0,"s":"EC$","c":"XCD","n":"East Caribbean dollar","i":84},{"t":0,"s":"AMD","c":"AMD","n":"Armenian dram","i":85},{"t":0,"s":"ƒ","c":"AWG","n":"Aruban florin","i":86},{"t":0,"s":"B$","c":"BSD","n":"Bahamian dollar","i":87},{"t":0,"s":"BHD","c":"BHD","n":"Bahraini dinar","i":88},{"t":0,"s":"Bds","c":"BBD","n":"Barbadian dollar","i":89},{"t":0,"s":"BZ$","c":"BZD","n":"Belize dollar","i":90},{"t":0,"s":"XOF","c":"CFA","n":"West African CFA franc","i":91},{"t":0,"s":"BD$","c":"BMD","n":"Bermudian dollar","i":92},{"t":0,"s":"Nu.","c":"BTN","n":"Bhutanese ngultrum","i":93},{"t":0,"s":"KM","c":"BAM","n":"Bosnia and Herzegovina konvertibilna marka","i":94},{"t":0,"s":"P","c":"BWP","n":"Botswana pula","i":95},{"t":0,"s":"B$","n":"Brunei dollar","c":"BND","i":96},{"t":0,"s":"FBu","c":"BIF","n":"Burundi franc","i":97},{"t":0,"s":"KHR","n":"Khmer riel","c":"KHR","i":98},{"t":0,"s":"Esc","c":"CVE","n":"Cape Verdean escudo","i":99},{"t":0,"s":"KY$","c":"KYD","n":"Cayman Islands dollar","i":100},{"t":0,"s":"KMF","c":"KMF","n":"Comorian franc","i":101},{"t":0,"s":"F","c":"CDF","n":"Congolese franc","i":102},{"t":0,"n":"Cuban peso","c":"CUC","s":"$","i":103},{"t":0,"c":"DJF","s":"Fdj","n":"Djiboutian franc","i":104},{"t":0,"c":"EGP","s":"£","n":"Egyptian pound","i":105},{"t":0,"c":"GQE","s":"CFA","n":"Central African CFA franc","i":106},{"t":0,"c":"ERN","s":"Nfa","n":"Eritrean nakfa","i":107},{"t":0,"c":"EEK","s":"KR","n":"Estonian kroon","i":108},{"t":0,"c":"ETB","s":"Br","n":"Ethiopian birr","i":109},{"t":0,"c":"FKP","s":"£","n":"Falkland Islands pound","i":110},{"t":0,"c":"FJD","s":"FJ$","n":"Fijian dollar","i":111},{"t":0,"c":"XPF","s":"F","n":"CFP franc","i":112},{"t":0,"c":"XAF","s":"CFA","n":"Central African CFA franc","i":113},{"t":0,"c":"GMD","s":"D","n":"Gambian dalasi","i":114},{"t":0,"c":"GEL","s":"GEL","n":"Georgian lari","i":115},{"t":0,"c":"GIP","s":"£","n":"Gibraltar pound","i":116},{"t":0,"c":"GTQ","s":"Q","n":"Guatemalan quetzal","i":117},{"t":0,"c":"GNF","s":"FG","n":"Guinean franc","i":118},{"t":0,"c":"GYD","s":"GY$","n":"Guyanese dollar","i":119},{"t":0,"c":"HTG","s":"G","n":"Haitian gourde","i":120},{"t":0,"c":"ISK","s":"kr","n":"Icelandic króna","i":121},{"t":0,"c":"XDR","s":"SDR","n":"Special Drawing Rights","i":122},{"t":0,"c":"IQD","s":"IQD","n":"Iraqi dinar","i":123},{"t":0,"c":"JMD","s":"J$","n":"Jamaican dollar","i":124},{"t":0,"c":"KPW","n":"Korean won","s":"W","i":125},{"t":0,"c":"LSL","n":"Lesotho loti","s":"M","i":126},{"t":0,"c":"LRD","s":"L$","n":"Liberian dollar","i":127},{"t":0,"c":"LYD","s":"LD","n":"Libyan dinar","i":128},{"t":0,"c":"MOP","s":"P","n":"Macanese pataca","i":129},{"t":0,"c":"MGA","s":"FMG","n":"Malagasy ariary","i":130},{"t":0,"c":"MWK","s":"MK","n":"Malawian kwacha","i":131},{"t":0,"c":"MVR","s":"Rf","n":"Maldivian rufiyaa","i":132},{"t":0,"c":"MRO","s":"UM","n":"Mauritanian ouguiya","i":133},{"t":0,"c":"MUR","s":"Rs","n":"Mauritian rupee","i":134},{"t":0,"c":"MDL","n":"Moldovan leu","s":"MDL","i":135},{"t":0,"c":"MNT","n":"Mongolian tugrik","s":"₮","i":136},{"t":0,"c":"MZM","s":"MTn","n":"Mozambican metical","i":137},{"t":0,"c":"MMK","n":"Myanma kyat","s":"K","i":138},{"t":0,"c":"PKR","s":"Rs.","n":"Pakistani rupee","i":139},{"t":0,"c":"PGK","s":"K","n":"Papua New Guinean kina","i":140},{"t":0,"c":"RWF","s":"RF","n":"Rwandan franc","i":141},{"t":0,"c":"STD","s":"Db","n":"São Tomé and Príncipe dobra","i":142},{"t":0,"c":"SCR","s":"SR","n":"Seychellois rupee","i":143},{"t":0,"c":"SLL","n":"Sierra Leonean leone","s":"Le","i":144},{"t":0,"c":"SBD","s":"SI$","n":"Solomon Islands dollar","i":145},{"t":0,"c":"SOS","s":"Sh.","n":"Somali shilling","i":146},{"t":0,"c":"SHP","s":"£","n":"Saint Helena pound","i":147},{"t":0,"c":"SDG","s":"SDG","n":"Sudanese pound","i":148},{"t":0,"c":"SRD","n":"Surinamese dollar","s":"$","i":149},{"t":0,"c":"SZL","n":"Swazi lilangeni","s":"E","i":150},{"t":0,"c":"SYP","s":"SYP","n":"Syrian pound","i":151},{"t":0,"c":"TJS","s":"TJS","n":"Tajikistani somoni","i":152},{"t":0,"c":"TZS","s":"TZS","n":"Tanzanian shilling","i":153},{"t":0,"c":"TMT","n":"Turkmen manat","s":"m","i":154},{"t":0,"c":"UGX","s":"USh","n":"Ugandan shilling","i":155},{"t":0,"c":"UZS","s":"UZS","n":"Uzbekistani som","i":156},{"t":0,"c":"VUV","s":"VT","n":"Vanuatu vatu","i":157},{"t":0,"c":"VEB","s":"Bs","n":"Venezuelan bolivar","i":158},{"t":0,"c":"WST","s":"WS$","n":"Samoan tala","i":159},{"t":0,"c":"YER","s":"YER","n":"Yemeni rial","i":160},{"t":0,"c":"ZWR","s":"Z$","n":"Zimbabwean dollar","i":161},{"t":0,"c":"BTC","n":"Bitcoin","s":"฿","i":162},{"t":0,"c":"LTC","n":"Litecoin","s":"Ł","i":163}];


	$a.module('ML.filters', [])
		.filter('selectMenu', function() {
			return function(tabSelect, value) {
				return tabSelect === value;
			};
		})
		.filter('truncate', function() {
			return function(string, len, replace) {
				if (string) {
					len = len || 50;
					replace = replace || '...';
					string = string.substring(0, len);
					if (string.length < len) return string;
					else return string + replace;
				}
			};
		})
		.filter('filterAction', function() {
			return function(action) {
				if (!action) return false;
				else if (action === "1" || action === "4" || action === "13") return true;
				else return false;
			};
		})
		.filter('keyName', function() {
			return function(key, obj) {
				if (!key) return;
				obj.forEach(function(item) {
					if (item.key == key) return 'item';
				});
			};
		})
		.filter('otherLang', function() {
			return function(listLang, objLang) {
				var tmpLang = [];
				if (listLang) {
					listLang.forEach(function(lang) {
						tmpLang.push(lang.lang);
					});
					objLang.forEach(function(langItem) {
						var ids = tmpLang.indexOf(langItem.key);
						if (ids > -1) {
							// tmpLang.splice(ids, 1);
							// tmpLang.push(langItem.name);
						}
					});
				}
				return tmpLang.toString().replace(/"/, '').replace('[', '').replace(']', '');
			};
		})
		.filter('arrayToText', function() {
			return function(array) {
				if (array) return array.toString().replace(/"/, '').replace('[', '').replace(']', '');
				else return;
			};
		})
		.filter('filterDevice', function() {
			return function(deviceId) {
				if (deviceId === 1) return 'Android';
				else if (deviceId === 2) return 'iOS';
				else if (deviceId === 3) return 'Winphone';
				else return '';
			};
		})
		.filter('parseVersion', function() {
			return function(version, deviceId){
				var getOS = function(deviceId){
					var tmpDevice = null;
					deviceOS.forEach(function(item){
						if(item.id === deviceId) tmpDevice = item.device;
					});
					return tmpDevice;
				};

				var getVersion = function(version){
					var getlistDevice = getOS(deviceId);
					var deviceV = null;
					getlistDevice.forEach(function(item){
						if(item.api === version) deviceV = item.version;
					});
					return deviceV;
				};
				return getVersion(version);
			};
		})
		.filter('checkDateTime', function(){
			return function(value){
				var date = moment(value);
				if(date.toISOString()===value){
					return date.format("DD/MM/YYYY HH:mm");
				} else return value;
			}
		})
		.filter('dataUnit', function(){
			return function(value){
				if(!value){
					return 0;
				} else {
					var newVal = 0, unit = "";
					if (value >= (1024 * 1024 * 1024)) {
						newVal = value / (1024 * 1024 * 1024);
						unit = "GB";
					} else if (value >= (1024 * 1024)) {
						newVal = value / (1024 * 1024);
						unit = "MB";
					} else if (value >= 1024) {
						newVal = value / 1024;
						unit = "KB";
					} else {
						newVal = value;
						unit = "B";
					}
					return newVal.toFixed(2).toString() + " " + unit;
				}
			}
		})

		.filter('displayArrayAsString', function(){
			return function(arrayRaw) {
				var str = "";
				for (var i = 0; i < arrayRaw.length; i++) {
					if (i !== (arrayRaw.length -1)){
						str += arrayRaw[i] + ", "
					} else {
						str += arrayRaw[i]
					}
				}
				return str;
			}
		})

		.filter('millSecondsToTimeString', function() {
			return function(millseconds) {
				var seconds = Math.floor(millseconds / 1000);
				var days = Math.floor(seconds / 86400);
				var hours = Math.floor((seconds % 86400) / 3600);
				var minutes = Math.floor(((seconds % 86400) % 3600) / 60);
				var timeString = '';
				if(days > 0) timeString += (days > 1) ? (days + " days ") : (days + " day ");
				if(hours > 0) timeString += (hours > 1) ? (hours + " hours ") : (hours + " hour ");
				if(minutes >= 0) timeString += (minutes > 1) ? (minutes + " minutes ") : (minutes + " minute ");
				return timeString;
			}
		})

		.filter('millSecondsToTimeStringMobile', function() {
			return function(millseconds) {
				var seconds = Math.floor(millseconds / 1000);
				var days = Math.floor(seconds / 86400);
				var hours = Math.floor((seconds % 86400) / 3600);
				var minutes = Math.floor(((seconds % 86400) % 3600) / 60);
				var timeString = '';
				if(days > 0) timeString += (days + "d ");
				if(hours > 0) timeString += (hours + "h ");
				if(minutes >= 0) timeString += (hours > 0) ? (minutes + "") : (minutes + "m ");
				return timeString;
			}
		})

		.filter('secondsToTimeString', function() {
			return function(seconds) {
				// var seconds = Math.floor(millseconds / 1000);
				var days = Math.floor(seconds / 86400);
				var hours = Math.floor((seconds % 86400) / 3600);
				var minutes = Math.floor(((seconds % 86400) % 3600) / 60);
				var timeString = '';
				if(days > 0) timeString += (days > 1) ? (days + " days ") : (days + " day ");
				if(hours > 0) timeString += (hours > 1) ? (hours + " hours ") : (hours + " hour ");
				if(minutes >= 0) timeString += (minutes > 1) ? (minutes + " minutes ") : (minutes + " minute ");
				return timeString;
			}
		})

		.filter('currency', function(){
			return function(value){
				if (!value) return "N/A";
				else {
					if (value == currencies[value].i) {
						return currencies[value].c;
					} else if (value > currencies[value].i) {
						for (var index = value + 1; index < currencies.length; index++) {
							if (value == currencies[index].i) {
								return currencies[index].c + ' (' + currencies[index].n + ')';
							}
						}
					} else {
						for (var index = value - 1; index < currencies.length; index++) {
							if (value == currencies[index].i) {
								return currencies[index].c + ' (' + currencies[index].n + ')';
							}
						}
					}
				}
			}
		})
		.filter('walletIconLink', function(){
			return function(icon){
				var splitedIcon = icon.split('/');
				var iconName = splitedIcon[splitedIcon.length - 1];
				return 'https://static.moneylover.me/img/icon/' + iconName + '.png';
			}
		})
		.filter('displayTrueTime', function(){
			return function(value){
				var date = moment(value);
				if(date.toISOString()===value){
					var now = moment();
					var n = now.format("YYYY-MM-DD");
					var d = date.format("YYYY-MM-DD");
					if (n === d) {
						return "today, " + date.format("HH:mm");
					} else if (now.diff(date, "days") === 1) {
						return "yesterday, " + date.format("HH:mm");
					} else {
						return date.format("DD/MM/YYYY HH:mm");
					}
				} else return value;
			}
		})
		.filter('walletType', function(){
			return function (value){
				if (!value) return 'Local';
				else if (value === 1) return 'SaltEdge';
				else return 'Finsify'; //2
			};
		});
}(angular));
