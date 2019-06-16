const mysql = require('mysql');

var db_manager = function (type) {
    var _ = this;
    _.type = type;

    _.db = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'manganime'
    });
    
    _.db.connect((err) => {
        if (err) {
          _.connected = false;
        }
        _.connected = true;
    });
};


db_manager.prototype.userExist = function(username) {
    var _ = this;

    return new Promise(function (resolve, reject) {
        if (_.connected === false) {
            reject('Database connection failed');
        }

        const request = 'SELECT * FROM USER WHERE username = ?;';

        _.db.query(request, [username], function(err, rows){
            if (err) reject(err);
            rows.length === 0 ? reject('User ' + username + ' doesn\'t exist') : resolve();
        });
    });    
};

db_manager.prototype.insertUser = function(username) {
    var _ = this;

    return new Promise(function (resolve, reject) {
        if (_.connected === false) {
            reject('Database connection failed');
        }

        const request = 'INSERT INTO USER (username) VALUES (?);';

        _.db.query(request, [username], function(err, rows){
            if (err) reject(err);
            resolve();
        });
    });    
};

db_manager.prototype.getMedia = function(username, name_type) {
    var _ = this;

    return new Promise(function (resolve, reject) {
        if (_.connected === false) {
            reject('Database connection failed');
        }

        const request = 'SELECT ml.id as id, ml.last_viewed, m.name, m.release_number, m.release_date, m.language, m.rss_url, m.url, m.release_url FROM user u JOIN medialist ml on u.id = ml.user_id JOIN media m on ml.Media_id = m.id JOIN typemedia tm on tm.id = m.TypeMedia_id WHERE u.username = ? and tm.name_type = ? and ml.followed = 1;';

        _.db.query(request, [username, name_type], function(err, rows){
            if (err) reject(err);
            resolve(rows);
        });
    });    
};

db_manager.prototype.updateMedia = function(media_id, data) {
     var _ = this;

     return new Promise(function (resolve, reject) {
        if (_.connected === false) {
            reject('Database connection failed');
        }

        const request = 'UPDATE media SET name = ?, release_number = ?, release_date = ?, language = ?, url = ?, release_url = ? WHERE id = ?';

        _.db.query(request, [data.name, data.release_number, data.release_date, data.language, data.url, data.release_url, media_id], function(err, rows){
            if (err) reject(err);
            resolve(rows);
        });
     });
};

db_manager.prototype.insertMedia = function(name_type, data) {
    var _ = this;

    return new Promise(function (resolve, reject) {
       if (_.connected === false) {
           reject('Database connection failed');
       }

       const request = 'INSERT INTO media (typemedia_id, name, rss_url, release_number, release_date, language, url, release_url) VALUES ((SELECT id FROM typemedia WHERE name_type = ?), ?, ?, ?, ?, ?, ?, ?)';

       _.db.query(request, [name_type, data.name, data.rss_url, data.release_number, data.release_date, data.language, data.url, data.release_url], function(err, rows){
           if (err) reject(err);
           resolve(rows);
       });
    });
};

db_manager.prototype.mediaExist = function(rss_url) {
    var _ = this;

    return new Promise(function (resolve, reject) {
        if (_.connected === false) {
            reject('Database connection failed');
        }

        const request = 'SELECT * FROM media WHERE rss_url = ?;';

        _.db.query(request, [rss_url], function(err, rows){
            if (err) reject(err);
            rows.length === 0 ? reject('RSS_URL ' + rss_url + ' doesn\'t exist') : resolve();
        });
    });    
};

db_manager.prototype.updateMediaList = function(id_medialist, value) {
    var _ = this;

    return new Promise(function (resolve, reject) {
       if (_.connected === false) {
           reject('Database connection failed');
       }

       const request = 'UPDATE medialist SET last_viewed = ? WHERE user_id = ?';

       _.db.query(request, [value, id_medialist], function(err, rows){
           if (err) reject(err);
           resolve(rows);
       });
    });
};

db_manager.prototype.insertMediaList = function(rss_url, username) {
    var _ = this;
    
    return new Promise(function (resolve, reject) {
        if (_.connected === false) {
            reject('Database connection failed');
        }
 
        const request = 'INSERT INTO medialist (media_id, user_id) VALUES ((SELECT id FROM media WHERE rss_url = ?), (SELECT id FROM user WHERE username = ?))';
 
        _.db.query(request, [rss_url, username], function(err, rows){
            if (err) reject(err);
            resolve(rows);
        });
     });
};

db_manager.prototype.unfollowMediaList = function(id_medialist) {
    var _ = this;
    
    return new Promise(function (resolve, reject) {
        if (_.connected === false) {
            reject('Database connection failed');
        }
 
        const request = 'UPDATE medialist SET followed = 0 where id = ?';
 
        _.db.query(request, [id_medialist], function(err, rows){
            if (err) reject(err);
            resolve(rows);
        });
     });
};

module.exports = db_manager;