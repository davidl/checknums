// init project
var compression = require('compression');
var express = require('express');

// setup a new database
var Datastore = require('nedb'),
    db = new Datastore({ filename: '.data/datafile', autoload: true }),
    dbJ = new Datastore({ filename: '.data/datafileJackpot', autoload: true });
var app = express();
var http = require('http');
var https = require('https');
var fs = require('fs');
var scrapeIt = require('scrape-it'); // https://github.com/IonicaBizau/scrape-it
var byLine = require('quickline').byLine;
var moment = require('moment-timezone');
var winnumsHostRemote = 'www.powerball.com';
var winnumsPathRemote = '/powerball/winnums-text.txt';
var winnumsPathLocal = 'winnums-text.txt';
var Twit = require('twit');
var twitterConfig = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
};
var T = new Twit(twitterConfig);
var drawingsFileName = 'drawings.json';
var drawingsPath = 'public/' + drawingsFileName;
var nextDrawingFilename = 'nextdrawing.json';
var nextDrawingPath = 'public/' + nextDrawingFilename;
var jsonfile = require('jsonfile');
var ghPages = require('gh-pages'); // https://github.com/tschaub/gh-pages
var ghPagesOptions = {
  add: true,
  branch: 'master',
  clone: '.data/gh-pages-tmp',
  message: 'Auto-generated commit from Glitch',
  repo: 'https://' + process.env.GH_TOKEN + '@github.com/davidl/checknums.git',
  silent: true,
  user: {
    name: process.env.GH_USER_NAME,
    email: process.env.GH_USER_EMAIL
  }
};

/*-- Purge CloudFlare cache --*/
function deleteCFCache () {
  var request = require('request');
  var headers = {
      'X-Auth-Email': process.env.CF_USER_EMAIL,
      'X-Auth-Key': process.env.CF_KEY,
      'Content-Type': 'application/json'
  };
  var urlPath = 'https://checknums.com/';
  var dataString = '{"files":["' + urlPath + drawingsFileName + '","' + urlPath + nextDrawingFilename + '"]}';
  var options = {
      url: 'https://api.cloudflare.com/client/v4/zones/' + process.env.CF_ZONE_ID + '/purge_cache',
      method: 'DELETE',
      headers: headers,
      body: dataString
  };
  function callback(error, response, body) {
      if (!error && response.statusCode == 200) {
        // if (JSON.parse(body).success) { // TODO: check JSON.parse(body)
        // } else {
        //   console.log('CloudFlare purge request FAILED. Response:', body);
        // }
      } else if (error) {
        console.log('Error calling CloudFlare API. Error:', body);
      }
  }
  request(options, callback);
}
/*-- END Purge CloudFlare cache --*/

/*-- DATABASE INITIALIZATION --*/
// Get the file from the Powerball site, parse it and add the drawings to the database.
// NOTE: this is only necessary when creating the database for the first time or if it needs to be recreated.
function dbInit () {
  var winnumsParsed = [];
  var processedLineNum = 0;

  function processWinnumsLine (x) {
    if (processedLineNum > 0 && processedLineNum < 49) {
      var line = x.split('  ');
      var dateArr = line[0].split('/');
      var dateSortable = dateArr[2] + dateArr[0] + dateArr[1];
      var draw = {
        date: line[0],
        dateSortable: dateSortable, // facilitate sorting in the database query
        dateLabel: moment(dateSortable).format('dddd M/D/YYYY'),
        white: [line[1], line[2], line[3], line[4], line[5]].sort(),
        red: line[6],
        multiplier: parseInt(line[7])
      };
      winnumsParsed.push(draw);
      db.insert(draw, function (err, drawAdded) {
        if(err) console.log("There's a problem with the database:", err);
        // else if(drawAdded) console.log('Drawing ' + draw.date + ' inserted in the database');
      });
    }
    processedLineNum++;
  }

  function parseWinnumsCB () {
    // Do not delete until the reference inside parseWinnums() is deleted.
  }

  function parseWinnums () {
    var options = {
      host: winnumsHostRemote,
      path: winnumsPathRemote
    };

    var callback = function (response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });
      response.on('end', function () {
        // console.log(str);
        var wstream = fs.createWriteStream(winnumsPathLocal);
        wstream.on('finish', function () {
          var readStream = fs.createReadStream(winnumsPathLocal, {encoding: 'ascii'});
          byLine(readStream, processWinnumsLine, parseWinnumsCB);
        });
        wstream.write(str);
        wstream.end();
      });
    };
    http.request(options, callback).end();
  }
  parseWinnums();
  
  db.insert(winnumsParsed, function (err, drawingsAdded) {
    if (err) {
      console.log("There's a problem with the database: ", err);
    } else if (drawingsAdded) {
      // console.log("Drawings from winnums-text.txt inserted in the database");
      db.count({}, function (err, count) {
        // console.log("There are " + count + " drawings in the database");
        if (err) console.log("There's a problem with the database: ", err);
      });
    }
  });
}
/*-- END DATABASE INITIALIZATION --*/


/*-- APP STARTUP DATABASE CHECK --*/
// This runs when the server is started:
db.count({}, function (err, count) {
  // console.log("There are " + count + " drawings in the database");
  if (err) console.log("There's a problem with the database: ", err);
  else if (count <= 0) dbInit(); // database is empty so let's populate it
});
/*-- END APP STARTUP DATABASE CHECK --*/

/*-- Github push --*/
function pushToGithub () {
  console.log('Pushing to Github...');
  ghPages.publish('public', ghPagesOptions);
}
/*-- END Github push --*/

/*-- EXPRESS ROUTING --*/
// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(compression());
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/drawings", function (request, response) {
  var dateNow = moment().tz('America/New_York');
  var dateStr = dateNow.format('MM/DD/YYYY');
  var hourNow = dateNow.toDate().getHours();
  var minuteNow = dateNow.toDate().getMinutes();
  var dayOfWeek = dateNow.toDate().getDay();
  var isDrawDay = dayOfWeek === 3 || dayOfWeek === 6;
  // The "Magic Hour" occurs after 2304 on draw day when we can expect that day's
  // results to be posted to the Powerball.com homepage:
  var isMagicHour = isDrawDay && hourNow === 23 && minuteNow > 4;
  // Calculate the last drawing date. If we're not in the Magic Hour, use the most recent Wednesday or Saturday:
  var lastDrawDateStr = isMagicHour ? dateStr : dateNow.day(dayOfWeek > 3 ? 3 : -1).format('MM/DD/YYYY');
  // console.log('isDrawDay: ' + isDrawDay);
  // console.log('isMagicHour: ' + isMagicHour);
  // console.log('lastDrawDateStr: ' + lastDrawDateStr);
  // console.log('dateStr: ' + dateStr);
  
  function sendDrawings (writeFile) {
    var responseData = [];
    db.find({}).sort({ dateSortable: -1 }).limit(48).exec(function (err, drawings) {
      drawings.forEach(function(drawing) {
        responseData.push({"date": drawing.date, "white": drawing.white, "red": drawing.red.toString(), "multiplier": drawing.multiplier});
      });
      response.json(responseData);
      if (writeFile) {
        jsonfile.writeFile(drawingsPath, responseData, function (err) {
          if (err) {
            console.error(err);
          } else {
            console.log('Results written to file.');
            pushToGithub();
          }
        });
      }
    });
  }
  
  function getLatestResults (drawingDate) {
    var scrapedData;
    var website = 'http://www.powerball.com';
    scrapeIt(website, {
      date: {
        selector: '#winnums h5',
        convert: t => t.replace('Winning Numbers ', '')
      },
      white: {
        listItem: '#winnums .white.ball'
      },
      red: {
        selector: '#winnums .red.ball',
        convert: r => r < 10 ? '0' + r : r
      },
      multiplier: {
        selector: '#powerplay .powerplay_value',
        convert: m => parseInt(m)
      }
    }, (err, page) => {
      if (!err && page) {
        scrapedData = page;
        var statusWhite = scrapedData.white; // for Twitter status
        for (var i = 0; i < 5; i++) {
          var ball = scrapedData.white[i];
          if (ball < 10) {
            scrapedData.white[i] = '0' + ball;
          }
        }
        var dateArr = scrapedData.date.split('/');
        if (dateArr[0] < 10) {
          dateArr[0] = '0' + dateArr[0];
        }
        if (dateArr[1] < 10) {
          dateArr[1] = '0' + dateArr[1];
        }
        scrapedData.date = dateArr.join('/');
        var dateSortable = dateArr[2] + dateArr[0] + dateArr[1];
        scrapedData.dateSortable = dateSortable;
        scrapedData.dateLabel = moment(dateSortable).format('dddd M/D/YYYY');
        
        // console.log('dateSortable', dateSortable);
        // console.log('drawingDate', drawingDate);
        // console.log('moment(dateSortable).format(\'MM/DD/YYYY\')', moment(dateSortable).format('MM/DD/YYYY'));
        
        if (drawingDate !== moment(dateSortable).format('MM/DD/YYYY')) {
          db.insert(scrapedData, function (err, resultsAdded) {
            if (err) {
              console.log("There's a problem adding scraped results to the database: ", err);
            } else if (resultsAdded) {
              console.log("Results inserted in the database for " + scrapedData.date + " drawing");
              sendDrawings(true);
              var statusDate = moment(dateSortable).format('ddd M/D');
              var statusRed = scrapedData.red < 10 ? Math.floor(scrapedData.red) : scrapedData.red;
              var status = 'Winning numbers for ' + statusDate + ': ' + statusWhite.join(', ') + ', #Powerball: ' + statusRed + '. Power Play: ' + scrapedData.multiplier + 'x. https://checknums.com/';
              tweetResults(status);
            } else {
              console.log("No error, but the latest results may not have been added.");
            }
          });
        } else {
          sendDrawings();
        }
      } else {
        console.log('Error scraping Powerball homepage:', err);
      }
    });
  }
  
  // Check if the database has the results from the last draw date
  var dbHasLatestResults = false;
  db.find({}).sort({ dateSortable: -1 }).limit(1).exec(function (err, drawings) {
    var drawingDate = '';
    drawings.forEach(function(drawing) {
      dbHasLatestResults = drawing.date == lastDrawDateStr;
      // console.log('drawing.date: ' + drawing.date);
      // console.log('lastDrawDateStr: ' + lastDrawDateStr);
      // console.log('dbHasLatestResults (getLatestResults if false): ' + dbHasLatestResults);
      drawingDate = drawing.date;
    });
  
    // If we have the latest results, send them. If not, scrape them (and then send them):
    if (dbHasLatestResults) {
      sendDrawings();
    } else {
      // console.log('Else: getLatestResults');
      getLatestResults(drawingDate);
    }
  });
});
  
function tweetResults (status) {
  if (status) {
    console.log('tweetResults:', status);
    T.post('statuses/update', { status: status }, function (err, data) {
      if (err) {
        console.log('Error posting tweet');
        console.log(err);
      }
    });
  }
};

// Un-comment if necessary to recreate the database with results scraped from the historical file on the Powerball site:
// removes entries from db and populates it with default drawings

// app.get('/reset', function (request, response) {
//   // removes all entries from the collection
//   db.remove({}, {multi: true}, function (err) {
//     if (err) {
//       console.log('There\'s a problem with the database: ', err);
//     } else {
//       console.log('Database cleared');
//       dbInit();
//       response.redirect('/');
//     }
//   });
// });

// app.get("/resetJackpot", function (request, response) {
//   // removes all entries from the collection
//   dbJ.remove({}, {multi: true}, function (err) {
//     if (err) {
//       console.log("There's a problem with the database: ", err);
//     } else {
//       console.log("Database cleared");
//       response.redirect("/");
//     }
//   });
// });

// app.get('/push', function (request, response) {
//   console.log('manual call to pushToGithub...');
//   pushToGithub();
//   response.redirect('/');
// });

// Listen for webhook POSTs from Github:
app.post('/purge-cache', function (request, response) {
  // console.log(request);
  console.log('purge CloudFlare cache...');
  deleteCFCache();
  response.redirect('/');
});

app.get("/jackpot", function (request, response) {
  var website = 'http://www.powerball.com';
  scrapeIt(website, {
    jackpot: {
      selector: '#jackpot h1',
      convert: t => t.replace(/\s\s+/g, ' ')
    },
    jackpotCashValue: {
      selector: '#jackpot h6',
      convert: c => c.replace(' Cash Value', '') 
    }
  }, (err, page) => {
    if (!err && page) {
      var dateNow = moment().tz('America/New_York');
      var dayOfWeek = dateNow.day();
      var isDrawDay = dayOfWeek === 3 || dayOfWeek === 6;
      var hourNow = dateNow.format('H');
      var minuteNow = dateNow.format('m');
      var isMagicHour = isDrawDay && hourNow === '23';
      // console.log('dateNow:', dateNow);
      // console.log('dayOfWeek:', dayOfWeek);
      // console.log('isDrawDay:', isDrawDay);
      // console.log('hourNow:', hourNow);
      // console.log('minuteNow:', minuteNow);
      // console.log('isMagicHour:', isMagicHour);
      if (isDrawDay) {
        if (!isMagicHour) {
          page.nextDrawDate = 'today';
          page.nextDrawDateSortable = dateNow.format('YYYYMMDD');
        } else {
          // If it's Magic Hour, check to see if the jackpot has been updated.
          // If the jackpot is empty OR if the jackpot has not been updated,
          // set the jackpot to 'results pending'
          // Otherwise, update the jackpot:
          var jackpotIsUpdated = false;
          dbJ.find({}).sort({ nextDrawDateSortable: -1 }).limit(1).exec(function (err, drawings) {
            drawings.forEach(function(drawing) {
              jackpotIsUpdated = drawing.jackpot !== page.jackpot;
              console.log('drawing.jackpot: ' + drawing.jackpot);
              console.log('page.jackpot: ' + page.jackpot);
              console.log('jackpotIsUpdated: ' + jackpotIsUpdated);
            });
          });
          if (!jackpotIsUpdated || page.jackpot.trim() === '') {
            console.log('isMagicHour: true, but jackpot has not been updated yet.');
            page.jackpot = 'results pending';
            var d;
            if (dayOfWeek === 3 ) {
              d = moment(dateNow.weekday(6));
            } else {
              d = moment(dateNow.add(4, 'days'));
            }
            page.nextDrawDate = d.format('dddd M/D');
            page.nextDrawDateSortable = d.format('YYYYMMDD');
          }
        }
      } else {
        var d = moment(dateNow.weekday(dayOfWeek < 3 ? 3 : 6));
        page.nextDrawDate = d.format('dddd M/D');
        page.nextDrawDateSortable = d.format('YYYYMMDD');
      }
      // if (page.nextDrawDate === 'today') {
      //   page.nextDrawDateSortable = dateNow.format('YYYYMMDD');
      // } else {
      //   page.nextDrawDateSortable = moment(dateNow.weekday(dayOfWeek < 3 ? 3 : 6)).format('YYYYMMDD');
      // }
      
      response.json(page);
      
      // If the jackpot has changed, send/write the results. If the jackpot is 
      // not empty (which occurs immediately following a drawing), tweet the jackpot:
      // var jackpotIsUpdated = false;
      // dbJ.find({}).sort({ nextDrawDateSortable: -1 }).limit(1).exec(function (err, drawings) {
      //   drawings.forEach(function(drawing) {
      //     jackpotIsUpdated = drawing.jackpot !== page.jackpot;
      //     // console.log('drawing.jackpot: ' + drawing.jackpot);
      //     // console.log('page.jackpot: ' + page.jackpot);
      //     // console.log('jackpotIsUpdated: ' + jackpotIsUpdated);
      //   });
      // });
      // if (jackpotIsUpdated) {
        dbJ.insert(page, function (err, jackpotAdded) {
          if (err) {
            console.log("There's a problem adding jackpot info to the database: ", err);
          } else if (jackpotAdded) {
            console.log("Jackpot inserted in the database: " + page.jackpot);
            jsonfile.writeFile(nextDrawingPath, page, function (err) {
              if (err) {
                console.error(err);
              } else {
                console.log('Updated jackpot written to file.');
                pushToGithub();
              }
            });
          } else {
            console.log("No error, but the latest jackpot info may not have been added.");
          }
        });
      jsonfile.writeFile(nextDrawingPath, page, function (err) {
        if (err) {
          console.error(err);
        } else {
          console.log('Updated jackpot written to file.');
          pushToGithub();
        }
      });
      // }
    } else {
      console.log('Error scraping Powerball homepage:', err);
      response.status(500).send('Error obtaining jackpot information.')
    }
  });
});

// Tweet jackpot/next drawing info:
app.get('/tweetNextDrawing', function (request, response) {
  dbJ.find({}).sort({ nextDrawDateSortable: -1 }).limit(1).exec(function (err, drawings) {
    drawings.forEach(function(drawing) {
      // Use "Today", "Tomorrow" or day name:
      var dateNow = moment().tz('America/New_York');
      var nextDrawDay = drawing.nextDrawDate.substr(0, drawing.nextDrawDate.indexOf(' '));
      if (drawing.nextDrawDate === 'today') {
        nextDrawDay = 'Today';
      } else if (drawing.nextDrawDateSortable === dateNow.add(1, 'days').format('YYYYMMDD') ) {
        nextDrawDay = 'Tomorrow';
      }
      // var nextDrawDay = drawing.nextDrawDate === 'today' ? 'Today' : drawing.nextDrawDate.substr(0, drawing.nextDrawDate.indexOf(' '));
      var status = nextDrawDay + '\'s Powerball jackpot is ' + drawing.jackpot + '! Track and check your tickets for FREE, no registration required: https://checknums.com/';
      tweetResults(status);
    });
  });
  response.redirect('/');
});


// listen for requests
var listener = app.listen(process.env.PORT, function () {
  // console.log('Your app is listening on port ' + listener.address().port);
});