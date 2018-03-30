'use strict';

require('../model/balance_cache');

const CURRENCY_LIST = {
    "t": 1425270543,
    "data": [
        {
            "c": "USD",
            "s": "$",
            "n": "United States Dollar",
            "t": 0,
            "i": 1
        },
        {
            "c": "GBP",
            "s": "£",
            "n": "Pound",
            "t": 0,
            "i": 2
        },
        {
            "c": "EUR",
            "s": "€",
            "n": "Euro",
            "t": 0,
            "i": 3
        },
        {
            "c": "VND",
            "s": "₫",
            "n": "Việt Nam Đồng",
            "t": 1,
            "i": 4
        },
        {
            "c": "CNY",
            "s": "¥",
            "n": "Yuan Renminbi",
            "t": 0,
            "i": 5
        },
        {
            "c": "JPY",
            "s": "¥",
            "n": "Yen",
            "t": 0,
            "i": 6
        },
        {
            "c": "BRL",
            "s": "R$",
            "n": "Reais",
            "t": 0,
            "i": 7
        },
        {
            "c": "RUB",
            "s": "руб",
            "n": "Rubles",
            "t": 0,
            "i": 8
        },
        {
            "c": "KRW",
            "s": "₩",
            "n": "Won",
            "t": 0,
            "i": 9
        },
        {
            "c": "THB",
            "s": "฿",
            "n": "Baht",
            "t": 0,
            "i": 10
        },
        {
            "c": "INR",
            "s": "₹",
            "n": "India Rupee",
            "t": 0,
            "i": 11
        },
        {
            "c": "CHF",
            "s": "Fr.",
            "n": "Francs",
            "t": 0,
            "i": 12
        },
        {
            "c": "DKK",
            "s": "Kr",
            "n": "Kroner",
            "t": 0,
            "i": 13
        },
        {
            "c": "SEK",
            "s": "kr",
            "n": "Sweden Krona",
            "t": 0,
            "i": 14
        },
        {
            "c": "PLN",
            "s": "zł",
            "n": "Poland Zlotych",
            "t": 0,
            "i": 15
        },
        {
            "c": "HUF",
            "s": "Ft",
            "n": "Hungary Forint",
            "t": 0,
            "i": 16
        },
        {
            "c": "NOK",
            "s": "kr",
            "n": "Norwegian krone",
            "t": 0,
            "i": 17
        },
        {
            "c": "BYR",
            "s": "BYR",
            "n": "Belarusian ruble",
            "t": 0,
            "i": 18
        },
        {
            "c": "DZD",
            "s": "DZD",
            "n": "Algerian Dinar",
            "t": 0,
            "i": 19
        },
        {
            "c": "AUD",
            "s": "$",
            "n": "Australia Dollars",
            "t": 0,
            "i": 20
        },
        {
            "c": "AZN",
            "s": "ман",
            "n": "Azerbaijan New Manats",
            "t": 0,
            "i": 21
        },
        {
            "c": "ARS",
            "s": "$",
            "n": "Argentina Pesos",
            "t": 0,
            "i": 22
        },
        {
            "c": "BDT",
            "s": "BDT",
            "n": "Bangladeshi taka",
            "t": 0,
            "i": 23
        },
        {
            "c": "BOB",
            "s": "$b",
            "n": "Bolivianos",
            "t": 0,
            "i": 24
        },
        {
            "c": "BGN",
            "s": "лв",
            "n": "Bulgarian lev",
            "t": 0,
            "i": 25
        },
        {
            "c": "CAD",
            "s": "C$",
            "n": "Canada Dollars",
            "t": 0,
            "i": 26
        },
        {
            "c": "CRC",
            "s": "₡",
            "n": "Colon",
            "t": 0,
            "i": 27
        },
        {
            "c": "HRK",
            "s": "kn",
            "n": "Croatian kuna",
            "t": 0,
            "i": 28
        },
        {
            "c": "CLP",
            "s": "$",
            "n": "Chile Pesos",
            "t": 0,
            "i": 29
        },
        {
            "c": "COP",
            "s": "$",
            "n": "Colombia Pesos",
            "t": 0,
            "i": 30
        },
        {
            "c": "CZK",
            "s": "Kč",
            "n": "Česká koruna",
            "t": 0,
            "i": 31
        },
        {
            "c": "MNT",
            "s": "₮",
            "n": "Tugriks",
            "t": 0,
            "i": 32
        },
        {
            "c": "HNL",
            "s": "L",
            "n": "Lempiras",
            "t": 0,
            "i": 33
        },
        {
            "c": "MAD",
            "s": "MAD",
            "n": "Moroccan Dirham",
            "t": 0,
            "i": 34
        },
        {
            "c": "MXN",
            "s": "$",
            "n": "Mexico Pesos",
            "t": 0,
            "i": 35
        },
        {
            "c": "NGN",
            "s": "₦",
            "n": "Nairas",
            "t": 0,
            "i": 36
        },
        {
            "c": "NZD",
            "s": "NZ$",
            "n": "New Zealand Dollars",
            "t": 0,
            "i": 37
        },
        {
            "c": "HKD",
            "s": "HK$",
            "n": "Hong Kong Dollars",
            "t": 0,
            "i": 38
        },
        {
            "c": "LAK",
            "s": "₭",
            "n": "Lao kip",
            "t": 0,
            "i": 39
        },
        {
            "c": "KES",
            "s": "KSh",
            "n": "Kenya Shilling",
            "t": 0,
            "i": 40
        },
        {
            "c": "DOP",
            "s": "RD$",
            "n": "Dominican Republic Pesos",
            "t": 0,
            "i": 41
        },
        {
            "c": "GHS",
            "s": "GH₵",
            "n": "Ghana Cedi",
            "t": 0,
            "i": 42
        },
        {
            "c": "ILS",
            "s": "₪",
            "n": "Israel New Shekels",
            "t": 0,
            "i": 43
        },
        {
            "c": "IDR",
            "s": "Rp",
            "n": "Indonesia Rupiah",
            "t": 0,
            "i": 44
        },
        {
            "c": "IRR",
            "s": "IRR",
            "n": "Iranian Rial",
            "t": 0,
            "i": 45
        },
        {
            "c": "JOD",
            "s": "JOD",
            "n": "Jordanian dinar",
            "t": 0,
            "i": 46
        },
        {
            "c": "KGS",
            "s": "лв",
            "n": "Kyrgyzstan Soms",
            "t": 0,
            "i": 47
        },
        {
            "c": "LVL",
            "s": "Ls",
            "n": "Latvia Lati",
            "t": 0,
            "i": 48
        },
        {
            "c": "LTL",
            "s": "Lt",
            "n": "Lithuania Litai",
            "t": 0,
            "i": 49
        },
        {
            "c": "MKD",
            "s": "ден",
            "n": "Macedonia Denars",
            "t": 0,
            "i": 50
        },
        {
            "c": "MZN",
            "s": "MT",
            "n": "Mozambique Meticais",
            "t": 0,
            "i": 51
        },
        {
            "c": "MYR",
            "s": "RM",
            "n": "Malaysia Ringgits",
            "t": 0,
            "i": 52
        },
        {
            "c": "ANG",
            "s": "NAƒ",
            "n": "Netherlands Antilles Guilders",
            "t": 0,
            "i": 53
        },
        {
            "c": "TWD",
            "s": "NT$",
            "n": "New Taiwan Dollar",
            "t": 0,
            "i": 54
        },
        {
            "c": "NIO",
            "s": "C$",
            "n": "Nicaragua Cordobas",
            "t": 0,
            "i": 55
        },
        {
            "c": "NPR",
            "s": "NRs",
            "n": "Nepalese Rupee",
            "t": 0,
            "i": 56
        },
        {
            "c": "OMR",
            "s": "﷼",
            "n": "Oman Rials",
            "t": 0,
            "i": 57
        },
        {
            "c": "PAB",
            "s": "B/.",
            "n": "Panama Balboa",
            "t": 0,
            "i": 58
        },
        {
            "c": "PHP",
            "s": "₱",
            "n": "Philippines Pesos",
            "t": 0,
            "i": 59
        },
        {
            "c": "PYG",
            "s": "Gs",
            "n": "Paraguay Guarani",
            "t": 0,
            "i": 60
        },
        {
            "c": "PEN",
            "s": "S/.",
            "n": "Peru Nuevos Soles",
            "t": 0,
            "i": 61
        },
        {
            "c": "QAR",
            "s": "QR",
            "n": "Qatar riyal",
            "t": 0,
            "i": 62
        },
        {
            "c": "RON",
            "s": "lei",
            "n": "Romanian Leu",
            "t": 0,
            "i": 63
        },
        {
            "c": "TTD",
            "s": "TT$",
            "n": "Trinidad and Tobago Dollars",
            "t": 0,
            "i": 64
        },
        {
            "c": "TRY",
            "s": "TL.",
            "n": "Turkish Liras",
            "t": 0,
            "i": 65
        },
        {
            "c": "TND",
            "s": "DT",
            "n": "Tunisian dinar",
            "t": 0,
            "i": 66
        },
        {
            "c": "UAH",
            "s": "₴",
            "n": "Ukraine Hryvnia",
            "t": 0,
            "i": 67
        },
        {
            "c": "UYU",
            "s": "$U",
            "n": "Uruguay Pesos",
            "t": 0,
            "i": 68
        },
        {
            "c": "AED",
            "s": "AED",
            "n": "United Arab Emirates dirham",
            "t": 0,
            "i": 69
        },
        {
            "c": "VEF",
            "s": "Bs",
            "n": "Venezuela Bolivares Fuertes",
            "t": 0,
            "i": 70
        },
        {
            "c": "KZT",
            "s": "T",
            "n": "Kazakhstani tenge",
            "t": 0,
            "i": 71
        },
        {
            "c": "RSD",
            "s": "din.",
            "n": "Serbia Dinar",
            "t": 0,
            "i": 72
        },
        {
            "c": "SAR",
            "s": "SR",
            "n": "Saudi Arabian Riyal",
            "t": 0,
            "i": 73
        },
        {
            "c": "SKK",
            "s": "SKK",
            "n": "Slovak crown",
            "t": 0,
            "i": 74
        },
        {
            "c": "ZAR",
            "s": "R",
            "n": "South African rand",
            "t": 0,
            "i": 75
        },
        {
            "c": "SGD",
            "s": "S$",
            "n": "Singapore Dollars",
            "t": 0,
            "i": 76
        },
        {
            "c": "LKR",
            "s": "Rs",
            "n": "Sri Lanka rupee",
            "t": 0,
            "i": 77
        },
        {
            "c": "ZMK",
            "s": "ZK",
            "n": "Zambian kwacha",
            "t": 0,
            "i": 78
        },
        {
            "c": "LBP",
            "s": "LBP",
            "n": "Lebanese Pound",
            "t": 0,
            "i": 79
        },
        {
            "c": "KWD",
            "s": "K.D",
            "n": "Kuwaiti Dinar",
            "t": 0,
            "i": 80
        },
        {
            "t": 0,
            "n": "Afghan afghani",
            "s": "AFN",
            "c": "AFN",
            "i": 81
        },
        {
            "t": 0,
            "s": "ALL",
            "c": "ALL",
            "n": "Albanian lek",
            "i": 82
        },
        {
            "t": 0,
            "n": "Angolan kwanza",
            "s": "AOA",
            "c": "AOA",
            "i": 83
        },
        {
            "t": 0,
            "s": "EC$",
            "c": "XCD",
            "n": "East Caribbean dollar",
            "i": 84
        },
        {
            "t": 0,
            "s": "AMD",
            "c": "AMD",
            "n": "Armenian dram",
            "i": 85
        },
        {
            "t": 0,
            "s": "ƒ",
            "c": "AWG",
            "n": "Aruban florin",
            "i": 86
        },
        {
            "t": 0,
            "s": "B$",
            "c": "BSD",
            "n": "Bahamian dollar",
            "i": 87
        },
        {
            "t": 0,
            "s": "BHD",
            "c": "BHD",
            "n": "Bahraini dinar",
            "i": 88
        },
        {
            "t": 0,
            "s": "Bds",
            "c": "BBD",
            "n": "Barbadian dollar",
            "i": 89
        },
        {
            "t": 0,
            "s": "BZ$",
            "c": "BZD",
            "n": "Belize dollar",
            "i": 90
        },
        {
            "t": 0,
            "s": "XOF",
            "c": "CFA",
            "n": "West African CFA franc",
            "i": 91
        },
        {
            "t": 0,
            "s": "BD$",
            "c": "BMD",
            "n": "Bermudian dollar",
            "i": 92
        },
        {
            "t": 0,
            "s": "Nu.",
            "c": "BTN",
            "n": "Bhutanese ngultrum",
            "i": 93
        },
        {
            "t": 0,
            "s": "KM",
            "c": "BAM",
            "n": "Bosnia and Herzegovina konvertibilna marka",
            "i": 94
        },
        {
            "t": 0,
            "s": "P",
            "c": "BWP",
            "n": "Botswana pula",
            "i": 95
        },
        {
            "t": 0,
            "s": "B$",
            "n": "Brunei dollar",
            "c": "BND",
            "i": 96
        },
        {
            "t": 0,
            "s": "FBu",
            "c": "BIF",
            "n": "Burundi franc",
            "i": 97
        },
        {
            "t": 0,
            "s": "KHR",
            "n": "Khmer riel",
            "c": "KHR",
            "i": 98
        },
        {
            "t": 0,
            "s": "Esc",
            "c": "CVE",
            "n": "Cape Verdean escudo",
            "i": 99
        },
        {
            "t": 0,
            "s": "KY$",
            "c": "KYD",
            "n": "Cayman Islands dollar",
            "i": 100
        },
        {
            "t": 0,
            "s": "KMF",
            "c": "KMF",
            "n": "Comorian franc",
            "i": 101
        },
        {
            "t": 0,
            "s": "F",
            "c": "CDF",
            "n": "Congolese franc",
            "i": 102
        },
        {
            "t": 0,
            "n": "Cuban peso",
            "c": "CUC",
            "s": "$",
            "i": 103
        },
        {
            "t": 0,
            "c": "DJF",
            "s": "Fdj",
            "n": "Djiboutian franc",
            "i": 104
        },
        {
            "t": 0,
            "c": "EGP",
            "s": "£",
            "n": "Egyptian pound",
            "i": 105
        },
        {
            "t": 0,
            "c": "GQE",
            "s": "CFA",
            "n": "Central African CFA franc",
            "i": 106
        },
        {
            "t": 0,
            "c": "ERN",
            "s": "Nfa",
            "n": "Eritrean nakfa",
            "i": 107
        },
        {
            "t": 0,
            "c": "EEK",
            "s": "KR",
            "n": "Estonian kroon",
            "i": 108
        },
        {
            "t": 0,
            "c": "ETB",
            "s": "Br",
            "n": "Ethiopian birr",
            "i": 109
        },
        {
            "t": 0,
            "c": "FKP",
            "s": "£",
            "n": "Falkland Islands pound",
            "i": 110
        },
        {
            "t": 0,
            "c": "FJD",
            "s": "FJ$",
            "n": "Fijian dollar",
            "i": 111
        },
        {
            "t": 0,
            "c": "XPF",
            "s": "F",
            "n": "CFP franc",
            "i": 112
        },
        {
            "t": 0,
            "c": "XAF",
            "s": "CFA",
            "n": "Central African CFA franc",
            "i": 113
        },
        {
            "t": 0,
            "c": "GMD",
            "s": "D",
            "n": "Gambian dalasi",
            "i": 114
        },
        {
            "t": 0,
            "c": "GEL",
            "s": "GEL",
            "n": "Georgian lari",
            "i": 115
        },
        {
            "t": 0,
            "c": "GIP",
            "s": "£",
            "n": "Gibraltar pound",
            "i": 116
        },
        {
            "t": 0,
            "c": "GTQ",
            "s": "Q",
            "n": "Guatemalan quetzal",
            "i": 117
        },
        {
            "t": 0,
            "c": "GNF",
            "s": "FG",
            "n": "Guinean franc",
            "i": 118
        },
        {
            "t": 0,
            "c": "GYD",
            "s": "GY$",
            "n": "Guyanese dollar",
            "i": 119
        },
        {
            "t": 0,
            "c": "HTG",
            "s": "G",
            "n": "Haitian gourde",
            "i": 120
        },
        {
            "t": 0,
            "c": "ISK",
            "s": "kr",
            "n": "Icelandic króna",
            "i": 121
        },
        {
            "t": 0,
            "c": "XDR",
            "s": "SDR",
            "n": "Special Drawing Rights",
            "i": 122
        },
        {
            "t": 0,
            "c": "IQD",
            "s": "IQD",
            "n": "Iraqi dinar",
            "i": 123
        },
        {
            "t": 0,
            "c": "JMD",
            "s": "J$",
            "n": "Jamaican dollar",
            "i": 124
        },
        {
            "t": 0,
            "c": "KPW",
            "n": "Korean won",
            "s": "W",
            "i": 125
        },
        {
            "t": 0,
            "c": "LSL",
            "n": "Lesotho loti",
            "s": "M",
            "i": 126
        },
        {
            "t": 0,
            "c": "LRD",
            "s": "L$",
            "n": "Liberian dollar",
            "i": 127
        },
        {
            "t": 0,
            "c": "LYD",
            "s": "LD",
            "n": "Libyan dinar",
            "i": 128
        },
        {
            "t": 0,
            "c": "MOP",
            "s": "P",
            "n": "Macanese pataca",
            "i": 129
        },
        {
            "t": 0,
            "c": "MGA",
            "s": "FMG",
            "n": "Malagasy ariary",
            "i": 130
        },
        {
            "t": 0,
            "c": "MWK",
            "s": "MK",
            "n": "Malawian kwacha",
            "i": 131
        },
        {
            "t": 0,
            "c": "MVR",
            "s": "Rf",
            "n": "Maldivian rufiyaa",
            "i": 132
        },
        {
            "t": 0,
            "c": "MRO",
            "s": "UM",
            "n": "Mauritanian ouguiya",
            "i": 133
        },
        {
            "t": 0,
            "c": "MUR",
            "s": "Rs",
            "n": "Mauritian rupee",
            "i": 134
        },
        {
            "t": 0,
            "c": "MDL",
            "n": "Moldovan leu",
            "s": "MDL",
            "i": 135
        },
        {
            "t": 0,
            "c": "MNT",
            "n": "Mongolian tugrik",
            "s": "₮",
            "i": 136
        },
        {
            "t": 0,
            "c": "MZM",
            "s": "MTn",
            "n": "Mozambican metical",
            "i": 137
        },
        {
            "t": 0,
            "c": "MMK",
            "n": "Myanma kyat",
            "s": "K",
            "i": 138
        },
        {
            "t": 0,
            "c": "PKR",
            "s": "Rs.",
            "n": "Pakistani rupee",
            "i": 139
        },
        {
            "t": 0,
            "c": "PGK",
            "s": "K",
            "n": "Papua New Guinean kina",
            "i": 140
        },
        {
            "t": 0,
            "c": "RWF",
            "s": "RF",
            "n": "Rwandan franc",
            "i": 141
        },
        {
            "t": 0,
            "c": "STD",
            "s": "Db",
            "n": "São Tomé and Príncipe dobra",
            "i": 142
        },
        {
            "t": 0,
            "c": "SCR",
            "s": "SR",
            "n": "Seychellois rupee",
            "i": 143
        },
        {
            "t": 0,
            "c": "SLL",
            "n": "Sierra Leonean leone",
            "s": "Le",
            "i": 144
        },
        {
            "t": 0,
            "c": "SBD",
            "s": "SI$",
            "n": "Solomon Islands dollar",
            "i": 145
        },
        {
            "t": 0,
            "c": "SOS",
            "s": "Sh.",
            "n": "Somali shilling",
            "i": 146
        },
        {
            "t": 0,
            "c": "SHP",
            "s": "£",
            "n": "Saint Helena pound",
            "i": 147
        },
        {
            "t": 0,
            "c": "SDG",
            "s": "SDG",
            "n": "Sudanese pound",
            "i": 148
        },
        {
            "t": 0,
            "c": "SRD",
            "n": "Surinamese dollar",
            "s": "$",
            "i": 149
        },
        {
            "t": 0,
            "c": "SZL",
            "n": "Swazi lilangeni",
            "s": "E",
            "i": 150
        },
        {
            "t": 0,
            "c": "SYP",
            "s": "SYP",
            "n": "Syrian pound",
            "i": 151
        },
        {
            "t": 0,
            "c": "TJS",
            "s": "TJS",
            "n": "Tajikistani somoni",
            "i": 152
        },
        {
            "t": 0,
            "c": "TZS",
            "s": "TZS",
            "n": "Tanzanian shilling",
            "i": 153
        },
        {
            "t": 0,
            "c": "TMT",
            "n": "Turkmen manat",
            "s": "m",
            "i": 154
        },
        {
            "t": 0,
            "c": "UGX",
            "s": "USh",
            "n": "Ugandan shilling",
            "i": 155
        },
        {
            "t": 0,
            "c": "UZS",
            "s": "UZS",
            "n": "Uzbekistani som",
            "i": 156
        },
        {
            "t": 0,
            "c": "VUV",
            "s": "VT",
            "n": "Vanuatu vatu",
            "i": 157
        },
        {
            "t": 0,
            "c": "VEB",
            "s": "Bs",
            "n": "Venezuelan bolivar",
            "i": 158
        },
        {
            "t": 0,
            "c": "WST",
            "s": "WS$",
            "n": "Samoan tala",
            "i": 159
        },
        {
            "t": 0,
            "c": "YER",
            "s": "YER",
            "n": "Yemeni rial",
            "i": 160
        },
        {
            "t": 0,
            "c": "ZWR",
            "s": "Z$",
            "n": "Zimbabwean dollar",
            "i": 161
        },
        {
            "t": 0,
            "c": "BTC",
            "n": "Bitcoin",
            "s": "฿",
            "i": 162
        },
        {
            "t": 0,
            "c": "LTC",
            "n": "Litecoin",
            "s": "Ł",
            "i": 163
        }
    ]
};

const MODE = {
    ALL: 1,
    FUTURE_EXCLUDE: 2
};

const mongoose = require('mongoose');
const moment = require('moment');
const BalanceWalletCached = mongoose.model('BalanceCache');
const async = require('async');
const Big = require('big.js');

function walletBalance(wallet_id, future_transaction_included, WalletModel, TransactionModel){
    const walletId = wallet_id;
    const future_included = future_transaction_included || false;
    const cache_mode = (future_included)? MODE.ALL : MODE.FUTURE_EXCLUDE;

    //detect wallet
    function checkWallet(walletId, callback){
        WalletModel.findOne({_id: walletId, isDelete: false})
            .populate('owner')
            .exec((err, wallet) => {
                if (err) return callback(err);

                if (!wallet) return callback('WalletNotFound');

                callback(null, wallet);
            });
    }

    //get transactions with populated category
    function getTransaction(walletId, callback){
        let query = {account: walletId, isDelete: false};

        TransactionModel.find(query)
            .populate({
                path: 'category',
                populate: {
                    path: 'parent'
                }
            })
            .populate('campaign')
            .populate({
                path: 'parent',
                populate: {
                    path: 'account'
                }
            })
            .exec((err, result) => {
                if (err) {
                    return callback(err);
                }

                callback(null, result);
            });
    }

    function getWalletLastSync(wallet_id, callback){
        TransactionModel.find({account: wallet_id})
            .select('updateAt')
            .sort('-updateAt')
            .skip(0)
            .limit(1)
            .exec((err, datas) => {
                if (err) return callback(err);

                if (datas.length === 0) return callback(null, 0);

                callback(null, datas[0].updateAt);
            });
    }

    //check cache
    function checkCachedBalance(wallet_id, mode, callback){
        getWalletLastSync(wallet_id, (errGetLastSync, lastSync) => {
            if (errGetLastSync) return callback(errGetLastSync);

            BalanceWalletCached.findByWalletIdAndMode(wallet_id, mode, (err, cache) => {
                if (err) return callback(err);

                if (!cache) return callback();

                const ls = moment(lastSync);
                const cachedDate = moment(cache.updated_at);

                if (process.env.CACHE_IGNORE && process.env.CACHE_IGNORE === 'true') {
                    return callback();
                }

                if (ls.isSameOrBefore(cachedDate)) {
                    return callback(null, cache.balance);
                }

                callback();
            });
        });
    }

    //cache balance
    function cacheBalance(walletId, balance, mode, callback){
        BalanceWalletCached.cacheBalance(walletId, balance, mode, callback);
    }

    function currencyParse(currency_id){
        for (let i = 0; i < CURRENCY_LIST.data.length; i++) {
            if (CURRENCY_LIST.data[i].i == currency_id) {
                return CURRENCY_LIST.data[i].c;
            }
        }
    }

    function balanceCalculate(transaction_list, default_currency_code, FUTURE_INCLUDED) {
        let result = {};
        result[default_currency_code] = new Big(0);

        transaction_list.forEach((transaction) => {
            function calc(){
                let real_amount = transaction.amount;

                if (transaction.category.type === 2) {
                    real_amount = 0 - transaction.amount;
                } else if (transaction.category.type === 1) {

                } else {
                    real_amount = 0;
                }

                if (transaction.original_currency) {
                    if (!result[transaction.original_currency]) {
                        result[transaction.original_currency] = new Big(0);
                    }

                    result[transaction.original_currency] = result[transaction.original_currency].plus(real_amount);
                } else {
                    result[default_currency_code] = result[default_currency_code].plus(real_amount);
                }
            }

            if (transaction &&
                !transaction.isDelete &&
                transaction.category &&
                !transaction.category.isDelete &&
                (!transaction.category.parent || (transaction.category.parent && !transaction.category.parent.isDelete))) {

                if ((transaction.parent && !transaction.parent.isDelete && !transaction.parent.account.isDelete) ||
                    !transaction.parent
                ) {
                    if (FUTURE_INCLUDED) {
                        calc();
                    } else {
                        let today = moment().startOf('day');

                        if (today.isSameOrAfter(transaction.displayDate)) {
                            calc();
                        }
                    }
                }
            }
        });

        return result;
    }

    function resultFormat(data){
        let arr = [];

        for (let key in data) {
            let obj = {};
            obj[key] = data[key].toFixed(2);
            arr.push(obj);
        }

        return arr;
    }

    return new Promise((resolve, reject) => {
        async.waterfall([
            function (cb) {
                checkWallet(walletId, cb);
            },

            function (wallet, cb){
                checkCachedBalance(wallet, cache_mode, (err, balance) => {
                    if (err) return cb(err);

                    cb(null, balance, wallet);
                });
            },

            function (balance, wallet, cb) {
                if (balance) {
                    return cb(null, balance, null, null);
                }


                getTransaction(wallet._id, (err, transaction_list) => {
                    if (err) return cb(err);

                    let default_currency_code = currencyParse(wallet.currency_id);

                    cb(null, null, transaction_list, default_currency_code);
                });
            },

            function (balance, transaction_list, default_currency_code, cb) {
                if (balance) return cb(null, balance);

                let new_balance = balanceCalculate(transaction_list, default_currency_code, future_included);
                new_balance = resultFormat(new_balance);

                cb(null, new_balance);

                cacheBalance(walletId, new_balance, cache_mode, (err) => {
                    if (err) console.log(err);
                });
            }
        ], function(err, result){
            if (err) return reject(err);

            resolve(result);
        });
    });
}

module.exports = walletBalance;