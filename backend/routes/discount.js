
module.exports = function (app, config) {
    app.get('/discount', staticsMain);
    app.get('/discount/*', staticsMain);
};
