"use strict";
let apiServer = require('express-api-server');

let options = {
    baseUrlPath: '/',
    cors: {},
    //sslKeyFile:  './keys/my-domain.key'),
    //sslCertFile: './keys/my-domain.cert')
};

let initRoutes = function(app, options) {
    app.use(options.baseUrlPath, [
        require('./deth-routes')
    ]);
};

apiServer.start(initRoutes, options);
