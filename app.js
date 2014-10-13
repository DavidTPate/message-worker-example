(function (module, express, logger, cookieParser, bodyParser, debug, requestType, AWS) {
    AWS.config.update(
        {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        }
    );

    var app = express(),
        debugHelper = debug('message-example'),
        DynamoDB = new AWS.DynamoDB(),
        server;

    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());

    app.get('/', function(req, res) {
       res.status(200).send('Health Check!');
    });

    app.post('/', requestType('application/json'), function (req, res, next) {
        if (req.body.Message) {
            var message = JSON.parse(req.body.Message);
            debugger;
            DynamoDB.putItem(
                {
                    Item: toDynamoRequest(message),
                    TableName: process.env.DYNAMO_TABLE
                }, function (err) {
                    if (err) {
                        return res.status(400).send('Failed to save message ' + err);
                    }
                    res.status(200).end();
                }
            );
        } else {
            res.status(200).send('No Message');
        }
    });

    /**
     * Converts a proeperty value into the dialect that dynamo needs
     * Example: {name:"jhorlin"} wold be converted to {"name":{'S':"jhorlin}}
     * @param field
     * @returns {{}}
     */
    function dynamoType(field) {
        var fieldObject = {},
            isArray = field instanceof Array,
            fieldType = isArray ? typeof field[0] : typeof field;
        switch (fieldType) {
            case 'object':
            {
                fieldObject[isArray ? 'BS' : 'B'] = isArray ? field.map(toBuffer) : toBuffer(field);
            }
                break;
            case 'number':
            {
                fieldObject[isArray ? 'NS' : 'N'] = isArray ? field.map(toString) : toString(field);
            }
                break;
            case 'boolean':
            {
                fieldObject[isArray ? 'SS' : 'S'] = isArray ? field.map(toString) : toString(field);
            }
                break;
            case 'string':
            {
                fieldObject[isArray ? 'SS' : 'S'] = field;
            }
                break;
            default :
            {
                throw new Error('cannot convert type for dynamo:' + fieldType);
            }
        }
        return fieldObject;
    }

    /**
     * Converts all the properties into Dynamo Dialect properties so that we can store them in dynamoDB
     * @param item
     * @returns {{}}
     */
    function toDynamoRequest(item) {
        var request = {};
        Object.keys(item).forEach(function (key) {
            request[key] = dynamoType(item[key]);
        });
        return request;
    }

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    // error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.send(err);
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.send(err);
    });

    app.set('port', process.env.PORT || 8000);

    server = app.listen(app.get('port'), function () {
        debugHelper('Express server listening on port ' + server.address().port);
    });

    module.exports = {
        app: app,
        server: server
    };

}(module, require('express'), require('morgan'), require('cookie-parser'), require('body-parser'), require('debug'),
  require('request-type'), require('aws-sdk')));