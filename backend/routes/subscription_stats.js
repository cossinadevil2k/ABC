var mongoose = require('mongoose');


module.exports = function(app, config){
    app.get('/subscription-stats', staticsMain)
};