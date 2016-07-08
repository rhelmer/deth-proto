var apiServer = require('express-api-server');
 
var options = {
    baseUrlPath: '/',
    cors: {},
    //sslKeyFile:  './keys/my-domain.key'),
    //sslCertFile: './keys/my-domain.cert')
};
 
var initRoutes = function(app, options) {
    app.use(options.baseUrlPath, [
        require('./deth-routes')
    ]);
};
 
apiServer.start(initRoutes, options);
