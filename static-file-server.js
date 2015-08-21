var express = require('express'),  
    app = express();  
  
console.log(__dirname + '/public') ;

app.use(express.static(__dirname + '/public'));  
  
app.listen(8080);