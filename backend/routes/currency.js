/*
	Currency
*/

var env = process.env.NODE_ENV;
var config = require('../../config/config')[env];
var fs = require('fs');
var dataPath = config.currency;
var dataCryptoCurrencyPath = config.crypto_currency;
const cryptocurrencies = require('cryptocurrencies');

function generateCrytoCurrency() {
	var cryptoCurrencyList = cryptocurrencies.symbols();
	var listCryptoCurrency = [];

	for (var i = 0; i < cryptoCurrencyList.length; i++) {
		var cryptoDataSample = {
			"c": cryptoCurrencyList[i],
			"s": cryptoCurrencyList[i],
			"n": cryptocurrencies[cryptoCurrencyList[i]] || cryptoCurrencyList[i],
			"t": 0, // type
			"i": i + 1000, //id
			"r": "8", // round
			"dm": ".",
			"gs": ","
		};

		if (cryptoDataSample.c !== "symbols") {
			listCryptoCurrency.push(cryptoDataSample);
		}
	}

	return listCryptoCurrency;
}

var appUpdate = function (req, res) {
	var listCurrency = req.body.listCurrency;
	var listCryptoCurrency = generateCrytoCurrency();
	var timeStamp = parseInt(new Date().getTime() / 1000, 10);
	var newData = { t: timeStamp, data: listCurrency };
	var newCryptoData = { t: timeStamp, data: listCryptoCurrency };
	fs.writeFile(dataPath, JSON.stringify(newData), { encoding: 'utf8', flag: 'w+' }, function (err) {
		fs.writeFile(dataCryptoCurrencyPath, JSON.stringify(newCryptoData), { encoding: 'utf8', flag: 'w+' }, function (error) {
			res.send({ error: !!err, msg: err });
		});
	});
};

var appGet = function (req, res) {
	var data = fs.readFileSync(dataPath);
	// var dataCrypto = fs.readFileSync(dataCryptoCurrencyPath);

	var newContent = data.toString();
	// var newCryptoContent = dataCrypto.toString();

	// var dataFromCryptoParse = JSON.parse(newCryptoContent);
	// var dataFromNormalParse = JSON.parse(newContent);

	// var dataFromCrypto = dataFromCryptoParse.data;
	// var dataFromNormal = dataFromNormalParse.data;

	// var dataNew = dataFromNormal.concat(dataFromCrypto);

	// var t = dataFromNormal.t;

	// var newData = {
	// 	t: t,
	// 	data: dataNew
	// }
	// newData = JSON.stringify(newData);

	res.send({ error: false, data: JSON.parse(newContent) });
};

module.exports = function (app, config) {
	app.get('/currency', staticsMain);
	app.post('/currency/get', appGet);
	app.post('/currency/update', appUpdate);
};