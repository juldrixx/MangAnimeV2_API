// import des modules parser
const parsers = {
    jetanime: require('./modules/parser_jetanime.js'),
    fanfox: require('./modules/parser_fanfox.js'),
    japscan: require('./modules/parser_japscan.js')
};

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
                            
                            !Object.keys(parsers).includes(site) && reject('Parser for ' + site + ' doesn\'t exist');
                            let parser = new parsers[site](media.rss_url);
                            
                            parser.getInformation().then(function (infoMedia) {
                                let updateMedia = new Promise(function (resolve, reject) {
                                    const data = {
                                        name: infoMedia.name,
                                        release_number: infoMedia.release_number,
                                        release_date: JSON.stringify(infoMedia.release_date),
                                        language: infoMedia.language,
                                        url: infoMedia.url,
                                        release_url: infoMedia.release_url,
                                    };

                                    db.updateMedia(media.id, data).then(result => {
                                        resolve({
                                            id: media.id,
                                            name: infoMedia.name,
                                            last_viewed: parseFloat(media.last_viewed),
                                            release_number: parseFloat(infoMedia.release_number),
                                            release_date: infoMedia.release_date,
                                            release_url: infoMedia.release_url,
                                            language: infoMedia.language,
                                            url: infoMedia.url,
                                            not_completed: infoMedia.release_number !== media.last_viewed,
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
        response.status(500).send();
    });
});

app.get('/update/:id_medialist/:value', function (request, response) {
    const id_medialist = request.params.id_medialist;
    const value = request.params.value;
    response.setHeader('Content-Type', 'application/json');

    console.log('############ Update ' + id_medialist + ' ############');
    const db = new db_manager();

    let update = new Promise(function (resolve, reject) {
        db.updateMediaList(id_medialist, value).then(() => {
            db.getMediaByIdMediaList(id_medialist).then(result => {
                result.not_completed = result.release_number !== result.last_viewed;
                result.release_date = JSON.parse(result.release_date);
                resolve(result);
            })
            .catch(error => {
                reject(error);
            });
        })
        .catch(error => {
            reject(error);
        });
    });
    
    update.then(result => {
        response.send(result);
    })
    .catch(error => {
        console.log(error);
        response.status(500).send();
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
        !Object.keys(parsers).includes(site) && reject('Parser for ' + site + ' doesn\'t exist');
        let parser = new parsers[site](rss_url);

        parser.getInformation().then(function (infoMedia) {

            let testMedia = new Promise(function (resolve, reject) {
                db.mediaExist(rss_url).then(result => {
                    const idMedia = result.id;
                    db.updateTypeMedia(rss_url, type).then(result => {
                        db.followMediaListByIdMedia(idMedia).then(result => {
                            resolve('Media ' + rss_url + ' already exists --> now followed');
                        })
                        .catch(error => {
                            reject(error);
                        });
                    })
                    .catch(error => {
                        reject(error);
                    })
                    
                 })
                 .catch(function () {
                    const data = {
                        name: infoMedia.name,
                        rss_url: rss_url,
                        release_number: infoMedia.release_number,
                        release_date: JSON.stringify(infoMedia.release_date),
                        language: infoMedia.language,
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
                    let testMediaList = new Promise(function (resolve, reject) {
                        db.testMediaList(rss_url, username).then(result => {
                            resolve('Media ' + rss_url + ' already in MediaList');
                        })
                        .catch(error => {
                            db.insertMediaList(rss_url, username).then(result => {
                                resolve(result);
                            })
                            .catch(error => {
                                reject(error);
                            });
                        });
                    });

                    testMediaList.then(result => {
                        db.getMedia(username, type).then(result => {
                            resolve(result.filter(media => {
                                if(media.rss_url === rss_url) {
                                    media.not_completed = media.release_number !== media.last_viewed;
                                    media.release_date = JSON.parse(media.release_date);
                                    return media;
                                };
                            }))
                        })
                        .catch(error => {
                            reject(error);
                        });
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
    });

    promise.then(result => {
        response.send(result);
    })
    .catch(error => {
        console.log(error);
        response.status(500).send();
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

    promise.then(() => {
        response.send({});
    })
    .catch(error => {
        console.log(error);
        response.status(500).send();
    });
});

// export de notre application vers le serveur principal
module.exports = app;