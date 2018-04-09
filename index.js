const __name__ = "steam-free-packages",
__shortname__ = "SFP",
__author__ = "Royalgamer06",
SteamAuth = require("steamauth"),
SteamUser = require("steam-user"),
SteamStore = require("steam-store"),
SteamCommunity = require("steamcommunity"),
jsdom = require("jsdom"),
$ = require("jquery")(jsdom.jsdom().defaultView),
fs = require("fs"),
request = require("request"),
CloudScraper = require("cloudscraper"),
chalk = require("chalk"),
setTitle = require('console-title');
setTitle('steam-free-packages');
console.log(chalk.cyan("==================================="))
console.log(chalk.cyan("steam-free-packages by Royalgamer06"))
console.log(chalk.cyan("==================================="))
var cacheStream = fs.createWriteStream("cache.txt", {"flags" : "a"});
var logStream = fs.createWriteStream("log.txt", { "flags": "a" });
var _log = console.log;
console.log = function() {
    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate(date) {
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();
        return "[" + ((day < 10) ? "0" + day : day) +
            "-" + ((month < 10) ? "0" + month : month) +
            "-" + ((year < 10) ? "0" + year : year) +
            " " + ((hour < 10) ? "0" + hour : hour) +
            ":" + ((minutes < 10) ? "0" + minutes : minutes) +
            ":" + ((seconds < 10) ? "0" + seconds : seconds) +
            "." + ("00" + milliseconds).slice(-3) + "] ";
    }
    var tolog = [formatConsoleDate(new Date()), first_parameter].concat(other_parameters);
    var str = "";
    tolog.forEach(function(arg) {
        str += (typeof arg === "string" ? arg : util.inspect(arg, false, null)) + " ";
    });
    str.slice(0, -1);
    logStream.write(str + "\r\n");
    _log.apply(console, [str]);
};
log = function(msg, pre="", color = chalk.white) {
  console.log(color((pre ? (pre + "> ") : "") + msg))
}
const config = JSON.parse(fs.readFileSync("config.json"));
const client = new SteamUser({
    enablePicsCache: true,
    changelistUpdateInterval: 100,
    picsCacheAll: true
});
const store = new SteamStore({
  country:  'DE',
  language: 'en'
});

var started = false,
    ownedPackages = [],
    fodQueue = [],
    cache = [],
    fodRequested = 0,
    mycountry = "US",
    genres = ['Free to Play', 'genre_demos'],
    steamdbLoginURL = "https://steamcommunity.com/openid/login?openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.realm=https%3A%2F%2Fsteamdb.info%2F&openid.return_to=https%3A%2F%2Fsteamdb.info%2Flogin%2F";

fs.readFile('cache.txt', 'utf8', function (err,data) {
    if (err) { return log(err, "readFile('cache.txt')", chalk.red); }
    var tmp = data.split(",")
    if (tmp.length > 1) {
      cache = $.map(tmp, function(value){
        return parseInt(value, 10);
      });
    }
    log("Loaded " + (tmp.length == 1 ? tmp.length-1: tmp.length) + " packages from cache" + ((tmp.length > 10) ? "" : tmp), null, chalk.yellow);
});

if (config.winauth_usage) {
    const SteamAuth = require("steamauth");
    SteamAuth.Sync(function(error) {
        if (error) console.log(error);
        var auth = new SteamAuth(config.winauth_data);
        auth.once("ready", function() {
            config.steam_credentials.twoFactorCode = auth.calculateCode();
            steamLogin();
        });
    });
} else {
    steamLogin();
}

function steamLogin() {
    config.steam_credentials.rememberPassword = true;
    config.steam_credentials.logonID = Date.now();
    client.logOn(config.steam_credentials);
    client.on("loggedOn", function(response) {
        client.getPlayerCount(0, function(result, players) {
            log("Currently " + chalk.blue(numberWithCommas(players)) + " user" + numberEnding(players) + " are logged into Steam.")
        });
    });
    client.on("error", function(error) {
        log(error);
    });
    client.on("accountInfo", function(name, country) {
        log("Logged into Steam as \"" + name + "\" " + client.steamID.getSteam3RenderedID() + " from " + country, "", chalk.green);
        mycountry = country;
        /* store.steam('getGenreList').then(function (results) {
          var len = results.genres.length;
          for (var i = 0; i < len; i++) {
            genres.push(results.genres[i].id);
          }
          console.log("Status: " + (results.status ? "Success" : "Error") + " | Genres (" + genres.length + "): " + genres.join(", "));
        });
        var glen = genres.length;
        for (var g = 0; g < glen; g++) {
          store.steam('getAppsInGenre', genres[g]).then(function (results) {
            var len = 0;
            var ilen = Object.keys(results.tabs).length;
            for (var i in results.tabs) {
              if (!results.tabs.hasOwnProperty(i)) { continue; }
              var elen = results.tabs[i].items.length;
              len = len + elen;
              for (var e = 0; e < elen; e++) {
                var id = results.tabs[i].items[e].id;
                requestSub(id, true);
              }
            }
            console.log("Status: " + (results.status ? "Success" : "Error") + " | Found " + len + " apps in genre " + results.name);
          });
        } */
    });
    client.on("accountLimitations", function(limited, communityBanned, locked, canInviteFriends) {
        var limitations = [];
        if (limited) {
            limitations.push("limited");
        }
        if (communityBanned) {
            limitations.push("community banned");
        }
        if (locked) {
            limitations.push("locked");
        }
        if (limitations.length === 0) {
            log("Our account has no limitations", null, chalk.greenBright);
        } else {
            log("Our account is " + limitations.join(", "), null, chalk.redBright);
        }
        if (canInviteFriends) {
            log("Our account can invite friends", null, chalk.greenBright);
        } else {
            log("Our account can't invite friends", null, chalk.redBright);
        }
    });
    client.on("vacBans", function(numBans, appids) {
        log("We have " + numBans + " VAC ban" + numberEnding(numBans.length), null, numBans.length > 0 ? chalk.redBright : chalk.greenBright);
        if (appids.length > 0) {
            log("We are VAC banned from app" + numberEnding(appids.length) + ": " + appids.join(", "));
        }
    });
    client.on("packageUpdate", function(packageid, data) {
        if (!ownedPackages.includes(packageid) &&
            data.packageinfo.licensetype === 1 && // Single Purchase
            data.packageinfo.status === 0 && // Available
            (data.packageinfo.billingtype === 12 || data.packageinfo.billingtype === 0) && // NoCost or FreeOnDemand
            (data.packageinfo.extended.purchaserestrictedcountries ? !data.packageinfo.extended.purchaserestrictedcountries.includes(mycountry) : true) &&
            (data.packageinfo.ExpiryTime ? data.packageinfo.ExpiryTime > Math.round(Date.now() / 1000) : true) &&
            (data.packageinfo.StartTime ? data.packageinfo.StartTime < Math.round(Date.now() / 1000) : true) &&
            (data.packageinfo.DontGrantIfAppIDOwned ? !client.ownsApp(data.packageinfo.DontGrantIfAppIDOwned) : true) &&
            (data.packageinfo.RequiredAppID ? client.ownsApp(data.packageinfo.RequiredAppID) : true)) {
                log("Received PICS Update " + data.changenumber + " for Package " + packageid + " with appids: " + data.packageinfo.appids.join());
                requestSub(packageid);
        }
    });
    client.on("licenses", function(licenses) {
        log("Our account owns " + licenses.length + " license" + numberEnding(licenses.length), null, chalk.gray);
        licenses.forEach(function(license) {
            if (!ownedPackages.includes(license.package_id)) {
                ownedPackages.push(license.package_id);
            }
        });
    });
    client.on("appOwnershipCached", function() {
        log("Cached app ownership", null, chalk.gray);
        if (!started) {
            started = true;
            log("Requesting cached licenses...")
            //requestFod();
            requestFreeSubs(cache);
        }
    });
    client.on("webSession", function(sessionID, cookies) {
        log("Got web session", null, chalk.green);
        var community = new SteamCommunity();
        community.setCookies(cookies);
        community.httpRequestGet(steamdbLoginURL, {
            followAllRedirects: true
        }, function(error, response, data) {
            if (error) { log(error); }
            var url = $("#openidForm", data).attr("action");
            var formdata = $("#openidForm", data).serializeObject();
            community.httpRequestPost(url, {
                followAllRedirects: true,
                formData: formdata
            }, steamdbLogin);
        });
    });
}

function steamdbLoginRetry(error, response, delay = 10000) {
  log(error + "! Retrying in " + millisecondsToStr(delay) + " ...", "SteamDB", chalk.red);
  setTimeout(function() {
      CloudScraper.request({
          url: (response.hasOwnProperty("request") && response.request.hasOwnProperty("href")) ? response.request.href : steamdbLoginURL,
          method: "GET"
      }, steamdbLogin);
  }, delay);
}

function steamdbLogin(error, response, data) {
    log("Attempting to login to SteamDB")
    if (error) { steamdbLoginRetry(error + " " + JSON.stringify(error), response); } else {
        var jar = request.jar();
		    // console.log("steamdbLogin Response: ", response) // + " (" + JSON.stringify(response.headers) + ")");
        if (!response.headers.hasOwnProperty("set-cookie")) {
            steamdbLoginRetry("response headers have no property \"set-cookie\"", response);
        } else {
          response.headers["set-cookie"].forEach(function(cookiestr) {
              var cookie = request.cookie(cookiestr);
              jar.setCookie(cookie, "https://steamdb.info/");
          });
          CloudScraper.request({
              //url: "https://steamdb.info/search/?a=app_keynames&type=-1&keyname=243&operator=3&keyvalue=1",
              url: "https://steamdb.info/search/?a=sub_keynames&keyname=1&operator=3&keyvalue=12",
              method: "GET",
              jar: jar
          }, function(error, response, data) {
              if (error) {
                  log(error);
              } else {
                  var freeSubs = [];
                  $("#table-sortable tr a", data).each(function() {
                      freeSubs.push(parseInt($(this).text().trim()));
                  });
                  var ownedSubsPromise = setInterval(function() {
                          if (ownedPackages.length > 0) {
                              clearInterval(ownedSubsPromise);
                              var unownedFreeSubs = $(freeSubs).not(ownedPackages).get().reverse();
                              log("Found " + freeSubs.length + " free sub" + numberEnding(freeSubs.length) + " of which " + unownedFreeSubs.length + " are not owned by us yet");
                              if (freeSubs.length < 1) {
                                  steamdbLoginRetry("Free packages returned by SteamDB: " + freeSubs.length, response);
                                  //console.log("Somehow unownedFreeSubs is " + unownedFreeSubs.length + ". Relogging...")
                                  //client.relog();
                              } else {
                                  requestFreeSubs(unownedFreeSubs);
                                  cacheStream.write(unownedFreeSubs.join());
                              }
                          }
                      }, 10);
              }
          });
        }
    }
}

function requestFreeSubs(unownedFreeSubs, silent=false) {
      var subsToAdd = unownedFreeSubs.splice(0, config.max_subs);
      if(!silent) { log("Attempting to request " + subsToAdd.length + " subs (" + subsToAdd.join() + ")"); }
      client.requestFreeLicense(subsToAdd, function(error, grantedPackages, grantedAppIDs) {
          log(error, "error", chalk.bgYellow);
          log(grantedPackages, "grantedPackages", chalk.bgYellow);
          log(grantedAppIDs, "grantedAppIDs", chalk.bgYellow);
          if (error) {
              log(error, null, chalk.red)
          } else {
              if (grantedPackages.length === 0) {
                  if(!silent) { log("No new packages were granted to our account", null, chalk.redBright); }
              } else {
                  log(grantedPackages.length + " New package" + numberEnding(grantedPackages.length) + " (" + grantedPackages.join() + ") were successfully granted to our account", null, chalk.greenBright);
              }
              if (grantedAppIDs.length === 0) {
                  if(!silent) { log("No new apps were granted to our account", null, chalk.redBright); }
              } else {
                  log(grantedAppIDs.length + " New app" + numberEnding(grantedAppIDs.length) + " (" + grantedAppIDs.join() + ") were successfully granted to our account", null, chalk.greenBright);
              }
              log("Waiting " + millisecondsToStr(config.delay) + " for a new attempt");
              setTimeout(function() {
                  requestFreeSubs(unownedFreeSubs)
              }, config.delay);
          }
      });
}

setInterval(function() { requestFod(); }, config.delay);

function requestFod() {
      fodRequested = 0;
      if (fodQueue.length > 0) {
          for (var i = 0; i < fodQueue.length && i <= 50; i++) {
              requestSub(fodQueue.pop());
          }
      }
}

function requestSub(packageid, silent=false){
    if (client.ownsApp(packageid)) { return; }
    if (fodRequested <= 50) {
        requestFreeSub(packageid, silent);
    } else {
        fodQueue.push(packageid);
    }
}

function requestFreeSub(packageid, silent=false) {
    if(!silent) { log("Attempting to request package id " + packageid); }
    fodRequested++;
    client.requestFreeLicense(packageid, function(error, grantedPackages, grantedAppIDs) {
        if (error) {
            log(error, null, chalk.red)
        } else {
            if (grantedPackages.length === 0) {
                if(!silent) { log("No new packages were granted to our account", null, chalk.redBright); }
            } else {
                log(grantedPackages.length + " New package" + numberEnding(grantedPackages.length) + " (" + grantedPackages.join() + ") were successfully granted to our account", null, chalk.greenBright);
                if (!ownedPackages.includes(packageid) && grantedPackages.includes(packageid)) {
                    ownedPackages.push(packageid);
                }
            }
            if (grantedAppIDs.length === 0) {
                if(!silent) { log("No new apps were granted to our account", null, chalk.redBright); }
            } else {
                log(grantedAppIDs.length + " New app" + numberEnding(grantedAppIDs.length) + " (" + grantedAppIDs.join() + ") were successfully granted to our account", null, chalk.greenBright);
            }
        }
    });
}

function millisecondsToStr(milliseconds) {
    var temp = Math.floor(milliseconds / 1000);
    var years = Math.floor(temp / 31536000);
    if (years) {
        return years + " year" + numberEnding(years);
    }
    var days = Math.floor((temp %= 31536000) / 86400);
    if (days) {
        return days + " day" + numberEnding(days);
    }
    var hours = Math.floor((temp %= 86400) / 3600);
    if (hours) {
        return hours + " hour" + numberEnding(hours);
    }
    var minutes = Math.floor((temp %= 3600) / 60);
    if (minutes) {
        return minutes + " minute" + numberEnding(minutes);
    }
    var seconds = temp % 60;
    if (seconds) {
        return seconds + " second" + numberEnding(seconds);
    }
    return "less than a second";
}
function numberEnding(number) {
    return (number > 1 || number < 1) ? "s" : "";
}
const numberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
$.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || "");
        } else {
            o[this.name] = this.value || "";
        }
    });
    return o;
};
