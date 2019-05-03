const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const requestret = require('requestretry');
const port = process.argv[2] || 9000;
const folder = "public";
const defext = ".html";
let logsocks = [];
let prosocks = [];
let isProcessing = false;
let propinsi = -1;
let kotakabupaten = -1;

const server = http.createServer(function (req, res) {
    //console.log(`${req.method} ${req.url}`);
    
    // parse URL
    const parsedUrl = url.parse(req.url);
    // extract URL path
    let pathname = `${parsedUrl.pathname}`;
    // based on the URL path, extract the file extention. e.g. .js, .doc, ...
    let ext = path.parse(pathname).ext;
    if (ext.length==0)
      ext = defext;
    //console.log(`${pathname} ext ${ext}`);
    // maps file extention to MIME typere
    const map = {
      '.ico': 'image/x-icon',
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.woff2': 'font/woff2'
    };

    if (req.method.toUpperCase() === "POST") {
    if (pathname === "/process") {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', ()=>{
            //console.log(body);
            let jdata = JSON.parse(body);
            res.setHeader("Content-Type", "application/json");
            
            if (isProcessing) {
              logsocks.forEach(function(socket) {
                socket.emit("log", "ERROR: Another process is running<br/>");
              });
              res.end(JSON.stringify({result: "BUSY", propinsi: propinsi, kotakabupaten : kotakabupaten}));
              return;
            }
            res.end(JSON.stringify({result: "OK"}));
            isProcessing = true;
            propinsi = jdata.prop;
            kotakabupaten = jdata.kab;
            let propkab = [];
            fs.readFile("public/d" + jdata.prop + "/" + jdata.kab + ".json", "utf-8", function(err, data){
                //console.log(data);
                let obj = JSON.parse(data);
                Object.keys(obj).forEach(function(key) {
                    //console.log("Kecamatan " + obj[key].nama);
                    //let kec = { kode: key, nama: obj[key].nama, kel: []};
                    //propkab.push(kec);
                    let datak = fs.readFileSync("public/d" + jdata.prop + "/" + jdata.kab + "/" + key + ".json", "utf-8");
                    let objk = JSON.parse(datak);
                    Object.keys(objk).forEach(function(keyk) {
                        //console.log("Kelurahan " + objk[keyk].nama);
                        //let kel = { kode: keyk, nama: objk[keyk].nama, tps: []};
                        //kec.push(kel);
                        let datat = fs.readFileSync("public/d" + jdata.prop + "/" + jdata.kab + "/" + key + "/" + keyk + ".json", "utf-8");
                        let objt = JSON.parse(datat);
                        Object.keys(objt).forEach(function(keyt) {
                            //console.log("TPS " + keyt + " " + objt[keyt].nama);
                            //let tps = { kode: keyt, nama: objt[keyt].nama, url: jdata.prop + "/" + jdata.kab + "/" + kec.kode + "/" + kel.kode + "/" + keyt + ".json", 
                                        //str: "Kecamatan " + kec.nama + " Kelurahan " + kel.nama + " " + objt[keyt].nama };
                            //kel.push(tps);
                            propkab.push({url: jdata.prop + "/" + jdata.kab + "/" + key + "/" + keyk + "/" + keyt + ".json", 
                            str: "Kecamatan " + obj[key].nama + " Kelurahan " + objk[keyk].nama + " " + objt[keyt].nama });
                            //logsocks.forEach(function(socket) {
                            //    socket.emit("log", "Kecamatan " + propkab[key].nama + " Kelurahan " + propkab[key].kel[keyk].nama + " " + objt[keyt].nama + "<br/>");
                            //});
                        });
                    });
                });

               downloadJson(propkab);
            });
            //dataPromised("d" + data.prop + "/" + data.kab + "/", 1)
            //.then(ok => {});
        });
        return;
    } else if (pathname === "/stop") {
      isProcessing = false;
      propinsi = -1;
      kotakabupaten = -1;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({result: "OK"}));
      logsocks.forEach(function(socket) {
        socket.emit("log", "Stopping download TPS data<br/>");
      });
      prosocks.forEach(function(socket) {
        socket.emit("prog", "++");
      });
      return;
    }

    }

    var folpath = folder + pathname;
    fileExistsPromised(folpath)
    .then(exists => { 
        if (exists) {
            return isDirPromised(folpath);
        }
        res.statusCode = 404;
        res.end(`File ${pathname} not found!`);
        return;
    })
    .then(isDir => {
        if (isDir) {
            folpath += "/index.html";
            ext = defext;
        }
        return fileReadPromised(folpath);
    })
    .then(data => {
        if (data) {
            res.setHeader('Content-type', map[ext] || 'text/plain' );
            res.end(data);
        }
    })
    .catch(ex => {
        //console.log(ex);
        res.statusCode = 500;
        res.end('Error getting the file');
    });

});

const fileExistsPromised = (filePath) => {
    return new Promise(resolve => {
      fs.exists(filePath, exists => {
        if(exists) {
          return resolve(true);
        }
        return resolve(false);
      });
    });
  };
  
  const isDirPromised = (filePath) => {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (error , stats) => {
        if(error) {
          return reject(error);
        }
        if (stats.isDirectory())
          return resolve(true);
  
        return resolve(false);
      });
    });
  };
  
  const fileReadPromised = (filePath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (error, data) => {
        if(error) {
          return reject(error);
        }
        return resolve(data);
      });
    });
  };

  const dataPromised = (filePath, depth, nama) => {
    //console.log("path = " + filePath + " depth= " + depth);
    if (depth > 3) {
        //console.log("depth " + depth);
        return new Promise((resolve) => {}) ;
    }
    
    return new Promise((resolve) => {
      fs.readdir(filePath, function(err, items) {
        if (err) {
          resolve(false);
          return;
        }
        
        let odata = [];
        for (var i=0; i<items.length; i++) {
          if (items[i].substr(-5) === ".json") {
            //console.log(items[i]);
            //console.log("channels/" + items[i]);
            let obj = JSON.parse(fs.readFileSync(filePath + items[i], 'utf-8'));
            Object.keys(obj).forEach(function(key) {
                //console.log(key, obj[key]);
                switch (depth) {
                case 1:
                    console.log("Kecamatan " + key + " " + obj[key].nama);
                    break;
                case 2:
                    console.log("Kelurahan " + key + " " + nama + " " + obj[key].nama);
                    break;
                }
                let filePath2 = filePath + items[i].substr(0, items[i].indexOf(".")) + "/";
                dataPromised(filePath2, depth + 1, obj[key].nama)
                .then(ok => {});
            });
          }
        }
  
        resolve(true);
      });
    });
  };

const downloadJson = (datas) => {
  if (datas.length == 0 && isProcessing) {
    isProcessing = false;
    propinsi = -1;
    kotakabupaten = -1;
    logsocks.forEach(function(socket) {
      socket.emit("log", "Process stopped remaining " + datas.length + "<br/>");
    });
    prosocks.forEach(function(socket) {
      socket.emit("prog", "--");
    });
    return;
  }

  if (!isProcessing) {
    logsocks.forEach(function(socket) {
      socket.emit("log", "Process stopped remaining " + datas.length + "<br/>");
    });
    prosocks.forEach(function(socket) {
      socket.emit("prog", "--");
    });
    return;
  }
  let data = datas.shift();
  prosocks.forEach(function(socket) {
    socket.emit("prog", "Processing data " + data.str);
  });
  requestret({
    url: 'https://pemilu2019.kpu.go.id/static/json/hhcw/ppwp/' + data.url,
    json: true,
    rejectUnauthorized: false,
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36'
    },
    // The below parameters are specific to request-retry
    maxAttempts: 3,   // (default) try 5 times
    retryDelay: 5000,  // (default) wait for 5s before trying again
    retryStrategy: requestret.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
  }, function(err, response, body){
    if (err) {
      logsocks.forEach(function(socket) {
        socket.emit("log", "<div style='background-color: #f25050' class='p-3 mb-2'>ERROR : Processing " + data.str + "</div><br/>");
      });
      downloadJson(datas);
      return;
    }
    // this callback will only be called when the request succeeded or after maxAttempts or on error
    if (response) {
      //console.log('The number of request attempts: ' + response.attempts);
    }
    //console.log(JSON.stringify(body));
    let msg = data.str + " OK";
    if (body.pemilih_j >= body.suara_total && body.pemilih_j >= body.pengguna_j && body.suara_total == body.suara_sah + body.suara_tidak_sah
      && body.chart['21'] + body.chart['22'] == body.suara_sah)
    {
      msg += " 01=" + body.chart['21'] + ", 02=" + body.chart['22'];
      let prestr = "";
      let poststr = "";
      if (body.chart['21'] < body.chart['22']) {
        prestr = "<span class='label label-success' style='font-size:100%'>";
        poststr = "</span>";
      } else {
        prestr = "<span class='label label-warning' style='font-size:100%'>";
        poststr = "</span>";
      }
      let imgstr = "";
      let ab = ['a', 'b', 'c', 'd', 'e'];
      for (let i=0; i<body.images.length; i++) {
          imgstr += " <a target='_blank' href='https://pemilu2019.kpu.go.id/img/c/" + data.url.substr(-14,3) + "/" + data.url.substr(-11,3) + "/" + data.url.substr(-14,9) + "/" + body.images[i] + "'>C1" +ab[i]+ "_URL</a>";
      }
      msg = prestr + msg + " <a target='_blank' href='https://pemilu2019.kpu.go.id/static/json/hhcw/ppwp/" + data.url + "'>JSON_URL</a>" + imgstr + poststr;
    } else {
      let jsnstr = JSON.stringify(body);
      if (jsnstr === "{}") {
        msg = "<span class='label label-default' style='font-size:100%'>Data belum tersedia " + data.str + "</span>";
      } else {
        let imgstr = "";
        let ab = ['a', 'b', 'c', 'd', 'e'];
        for (let i=0; i<body.images.length; i++) {
            imgstr += " <a target='_blank' href='https://pemilu2019.kpu.go.id/img/c/" + data.url.substr(-14,3) + "/" + data.url.substr(-11,3) + "/" + data.url.substr(-14,9) + "/" + body.images[i] + "'>C1" +ab[i]+ "_URL</a>";
        }
        msg = "<div style='background-color: #f25050' class='p-3 mb-2'>ERROR : Data invalid " + data.str + " <a target='_blank' href='https://pemilu2019.kpu.go.id/static/json/hhcw/ppwp/" + data.url + "'>JSON_URL</a>" + imgstr + " json=" + jsnstr + "</div>";
      }
    }
    logsocks.forEach(function(socket) {
      socket.emit("log", msg + "<br/>");
    });
    downloadJson(datas);
  });
};

const downloadPromised = (url, str, count) => {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      json: true
    }, function(error, response, body) {
      if (error)
        reject({count: count+1, url: url, str: str});
      resolve({body :body, str: str, url: url});
    });
  });
};
  

  const io = require('socket.io')(server, {
    path: '/socket.io',
    serveClient: false,
    // below are engine.IO options
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
  });

  io.of("/log").on("connect", function(socket) {
    //console.log("connection to log");
    
    //socket.emit("log", os.uptime());
    socket.closing = false;
    logsocks.push(socket);

    socket.on("close", function() {
        socket.closing = true;
        for( let i = 0; i < logsocks.length; i++){ 
            if ( logsocks[i] === socket) {
                logsocks.splice(i, 1); 
                break;
            }
         }
    });
  });

  io.of("/prog").on("connect", function(socket) {
    //console.log("connection to prog");
    
    //socket.emit("log", os.uptime());
    socket.closing = false;
    prosocks.push(socket);

    socket.on("close", function() {
        socket.closing = true;
        for( let i = 0; i < prosocks.length; i++){ 
            if ( prosocks[i] === socket) {
                prosocks.splice(i, 1); 
                break;
            }
         }
    });
  });

  console.log(`Server listening on port ${port}`);

  server.listen(port);

let urlx = 'http://127.0.0.1:' + port;
let start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
require('child_process').exec(start + ' ' + urlx);
