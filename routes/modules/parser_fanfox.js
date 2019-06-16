'use strict';
var fetch = require('node-fetch');
var xpath = require('xpath');
var DOMParser = require('xmldom').DOMParser;

var parser_fanfox = function (rss_url) {
    var _ = this;
    _.rss_url = rss_url;
};


parser_fanfox.prototype.getInformation = function () {
    var _ = this;
    return new Promise(function (resolve, reject) {
        fetch(_.rss_url)
        .then(function (reponse) {
            return reponse.text();
        })
        .then(function (reponse) {
            try {
                let doc = new DOMParser().parseFromString(reponse);
                let date = xpath.select('//item[1]/pubDate', doc)[0].firstChild.data;
                let day_date = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                let month_date = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                let name = xpath.select('//channel[1]/title', doc)[0].firstChild.data;
                let release_url = xpath.select('//item[1]/link', doc)[0].firstChild.data;
                let release_date = {
                    'day_name': day_date.indexOf(date.split(',')[0]),
                    'day': parseInt(date.split(' ')[1]),
                    'month': month_date.indexOf(date.split(' ')[2]),
                    'year': parseInt(date.split(' ')[3]),
                    'hour': parseInt(date.split(' ')[4].split(':')[0]),
                    'minute': parseInt(date.split(' ')[4].split(':')[1]),
                    'second': parseInt(date.split(' ')[4].split(':')[2]),
                };
                let release_number = parseFloat(xpath.select('//item[1]/title', doc)[0].firstChild.data.split('Ch.')[1]);
                let release_language = 'VUS';

                resolve({
                    'name': name.trim(),
                    'release_url': release_url,
                    'release_date': release_date,
                    'release_number': release_number,
                    'language': release_language,
                    'name_url': _.rss_url.split('/')[_.rss_url.split('/').length - 1].split('.xml')[0],
                    'url': release_url.split('/manga/')[0] + '/manga/' + release_url.split('/manga/')[1].split('/')[0] + '/',
                });
            }
            catch (error) {
                console.log(error);
                reject('RSS URL INCORRECT !');
            }
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

parser_fanfox.prototype.verifyURL = function () {
    var _ = this;
    return new Promise(function (resolve, reject) {
        fetch(_.rss_url)
        .then(function (reponse) {
            return reponse.text();
        })
        .then(function () {
            _.getInformation().then(function (){
                resolve();
            })
            .catch(function (error) {
                reject(error);
            });
        })
        .catch(function (error) {
            reject(error);
        });
    });
};

module.exports = parser_fanfox;