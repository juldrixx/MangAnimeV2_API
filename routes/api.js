// import des modules parser
var parser_jetanime = require('./modules/parser_jetanime.js');
var parser_fanfox = require('./modules/parser_fanfox.js');
var parser_japscan = require('./modules/parser_japscan.js');

// import du module db
var db_manager = require('./modules/db_manager.js');

// import du module Express
var express = require('express');
var app = express.Router();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended: false}));

// parse application/json
app.use(bodyParser.json());

app.get('/get/:type/:username', function (request, response) {
    const type = request.params.type;
    const username = request.params.username;
    response.setHeader('Content-Type', 'application/json');

    console.log('############ GET ' + type + ' ############');
    const db = new db_manager();
    
    let promise = new Promise(function (resolve, reject) {
        let testUser = new Promise(function (resolve, reject) {
            db.userExist(username).then(function () {
                resolve('User ' + username + ' exists');
             })
             .catch(function () {
                 db.insertUser(username).then(function () {
                    resolve('User ' + username + ' inserted');
                 })
                 .catch(function (error) {
                    reject(error);
                 })
             });
        });
        
        testUser.then(() => {
            let getMedia = new Promise(function (resolve, reject) {
                db.getMedia(username, type).then(result =>{
                    let traitementRssURL = function(media) {
                        return new Promise(function (resolve, reject) {
                            let url_splitted = media.rss_url.split('.');
                            let site = url_splitted[0].includes('www') ? url_splitted[1] : url_splitted[0].split('://')[1];
                            
                            try {
                                let parser = eval('new parser_' + site + '(\'' + media.rss_url + '\')');
                                parser.getInformation().then(function (infoMedia) {
                                    let updateMedia = new Promise(function (resolve, reject) {
                                        var date = new Date(infoMedia.release_date.year, infoMedia.release_date.month, infoMedia.release_date.day, infoMedia.release_date.hour, infoMedia.release_date.minute,infoMedia.release_date.second);
                                        const data = {
                                            name: infoMedia.title,
                                            release_number: infoMedia.release_number,
                                            release_date: date.toISOString().replace(/([^T]+)T([^\.]+).*/g, '$1 $2'),
                                            language: infoMedia.release_language,
                                            url: infoMedia.url,
                                            release_url: infoMedia.release_url,
                                        };

                                        db.updateMedia(media.id, data).then(result => {
                                            resolve({
                                                'title': infoMedia.title,
                                                'last_release_viewed': parseFloat(media.last_viewed),
                                                'last_release': parseFloat(infoMedia.release_number),
                                                'release_date': infoMedia.release_date,
                                                'release_url': infoMedia.release_url,
                                                'release_language': infoMedia.release_language,
                                                'url': infoMedia.url,
                                                'not_completed': infoMedia.release_number !== media.last_viewed,
                                            });
                                        })
                                        .catch(error => {
                                            reject(error);
                                        });
                                    });

                                    updateMedia.then(result => {
                                        resolve(result);
                                    })
                                    .catch(error => {
                                        reject(error);
                                    });                                    
                                })
                                .catch(function (error) {
                                    reject(error);
                                });
                            }
                            catch (error) {
                                reject(error);
                            }
                        });
                    };

                    Promise.all(result.map(traitementRssURL)).then(result => {
                        resolve(result);
                    })
                    .catch(error => {
                        reject(error);
                    });
                })
                .catch(error => {
                    reject(error);
                })
            });

            getMedia.then(result => {
                resolve(result);
            })
            .catch(error => {
                reject(error);
            });
        })
        .catch((error) => {
            reject(error);
        });
    });

    promise.then(result =>{
        response.send(result);
    })
    .catch(error => {
        console.log(error);
        response.send({});
    });
});

app.get('/update/:id_medialist/:value', function (request, respond) {
    const id_medialist = request.params.id_medialist;
    const value = request.params.value;
    response.setHeader('Content-Type', 'application/json');

    console.log('############ Update ' + id_medialist + ' ############');
    const db = new db_manager();

    db.updateMediaList( id_medialist, value).then(() => {
        respond.send({});
    })
    .catch(() => {
        respond.send({})
    });
});

app.post('/add', function (request, response) {
    const type = request.body.type;
    const rss_url = request.body.rss;
    const username = request.body.username;
    response.setHeader('Content-Type', 'application/json');

    console.log('############ ADD ' + type + ' ############');
    const db = new db_manager();

    let url_splitted = rss_url.split('.');
    let site = url_splitted[0].includes('www') ? url_splitted[1] : url_splitted[0].split('://')[1];

    let promise = new Promise(function (resolve, reject) {
        try {
            let parser = eval('new parser_' + site + '(\'' + rss_url + '\')');
            parser.getInformation().then(function (infoMedia) {

                let testMedia = new Promise(function (resolve, reject) {
                    db.mediaExist(rss_url).then(function () {
                        resolve('Media ' + rss_url + ' exists');
                     })
                     .catch(function () {

                        var date = new Date(infoMedia.release_date.year, infoMedia.release_date.month, infoMedia.release_date.day, infoMedia.release_date.hour, infoMedia.release_date.minute,infoMedia.release_date.second);
                        const data = {
                            name: infoMedia.title,
                            rss_url: rss_url,
                            release_number: infoMedia.release_number,
                            release_date: date.toISOString().replace(/([^T]+)T([^\.]+).*/g, '$1 $2'),
                            language: infoMedia.release_language,
                            url: infoMedia.url,
                            release_url: infoMedia.release_url,
                        };

                        db.insertMedia(type, data).then(result => {
                            resolve('Media ' + rss_url + ' inserted');
                        })
                        .catch(error => {
                            reject(error);
                        });
                     });
                });

                testMedia.then(() => {
                    let insertMediaList = new Promise(function (resolve, reject) {
                        db.insertMediaList(rss_url, username).then(result => {
                            resolve(result);
                        })
                        .catch(error => {
                            reject(error);
                        });
                    });

                    insertMediaList.then(result => {
                        resolve(result);
                    })
                    .catch(error => {
                        reject(error);
                    });
                })
                .catch(error => {
                    reject(error);
                })
            })
            .catch(function (error) {
                reject(error);
            });
        }
        catch (error) {
            reject(error);
        }
    });

    promise.then(result => {
        console.log(result)
        response.send(true);
    })
    .catch(error => {
        console.log(error);
        response.send(false);
    });
});

app.get('/unfollow/:id_medialist', function (request, response) {
    const id_medialist = request.params.id_medialist;
    response.setHeader('Content-Type', 'application/json');

    console.log('############ unfollow ' +  id_medialist + ' ############');
    const db = new db_manager();

    let promise = new Promise(function (result, reject) {
        db.unfollowMediaList(id_medialist).then(function () {
            result();
        })
        .catch(function (error) {
            reject(error);
        });
    });

    promise.then(function () {
        response.send(true);
    })
    .catch(function (err) {
        console.log(err);
        response.send(false);
    });
});

// export de notre application vers le serveur principal
module.exports = app;