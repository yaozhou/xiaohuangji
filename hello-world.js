var http = require("http") ;
var url = require("url") ;
var xml2js = require("xml2js") ;
var querystring = require("querystring") ;
var req = require('request') ;




// 调试方法
function dump_obj(myObject) {  
  var s = "";  
  for (var property in myObject) {  
   s = s + "\n "+property +": " + myObject[property] ;  
  }  
    console.log(s) ;
} 

// 验证接口,目前不做检测，直接通过
function route_get(pathname, qstring, response) {
    console.log("get(" + pathname + ") qstring(" + qstring + ")") ;
    
    var arg = querystring.parse(qstring) ;
    
    response.writeHead(200, {"Content-Type": "text/plain"}) ;
    if (arg.echostr != null)
        response.write(arg.echostr) ;
    else
        response.write("argument error\n") ;

    response.end() ;
}

// 一些目前还不支持的消息(事件，位置，声音等消息)
function weixin_msg_not_supported(from_user, to_user, response) {    
    send_txt_msg(from_user, to_user, "亲，能说人话不?", response) ;
}


// URI格式错误时的回复消息
function uri_not_supported(response) {
    response.writeHead(200, {"Content-Type": "text/plain"}) ;
    response.write("\n") ;
    response.end() ;
}

// 回复一条文本消息
function send_txt_msg(from_user, to_user, content, response) {

    var time = Math.round(new Date().getTime() / 1000);

    var output = "" + "<xml>" + 
	"<ToUserName><![CDATA[" + to_user + "]]>" +
        "</ToUserName>" + 
	"<FromUserName><![CDATA[" + from_user + "]]>" +
        "</FromUserName>" + 
	"<CreateTime>" + time + "</CreateTime>" + 
	"<MsgType><![CDATA[text]]></MsgType>" + 
	"<Content><![CDATA[" + content + "]]></Content>" + 
	"<FuncFlag>" + "0"  + "</FuncFlag>" + 
	"</xml>\n";

    response.write(output) ;
    response.writeHead(200, {"Content-Type": "text/plain"}) ;
    response.end() ;
}

function msg_handle(xml_obj, response) {

    // 调用小黄鸡接口的回调函数
    function get_chicken_answer_callback(error, chick_resp, body) {
        var answer ;
        if (!error && chick_resp.statusCode == 200) {
            eval("url_resp = " + body) ;
            if (url_resp.response != null)
                answer = url_resp.response ;
            else
                answer = "听不懂，请说人话，谢谢" ;
        }else { // 无法正常链接到小黄鸡官网
            answer = "小黄鸡出去找MM去了，没空陪你聊天了" ;
        }
        console.log("Got Answer(" + answer + ")") ;
        send_txt_msg(xml_obj.ToUserName, xml_obj.FromUserName, 
                     answer, response) ;
    }
    
    // 检测消息类型，并回复文本消息和订阅消息
    if (xml_obj.MsgType == null || xml_obj.MsgType[0] == null) {
        uri_not_supported(response) ;
        return ;
    }

    var msg_type = xml_obj.MsgType[0] ;

    // 文本消息
    if (msg_type == "text") {
        var uri = "http://api.simsimi.com/request.p?" + 
            "key=cfd1c417-b89f-480e-ad82-4bb4abaf7d88" + 
            "&lc=zh&ft=1.0&text=" ;
        console.log("Recv TextMsg (" + xml_obj.Content[0] + ")") ;
        uri += xml_obj.Content[0] ;

        req(uri, get_chicken_answer_callback) ;

    }else if (msg_type == "event" && xml_obj.Event[0]  == "subscribe") {
        // 订阅事件
        var text =   "小黄鸡陪聊内测中,欢迎文本消息调戏,意见建议请留言阿耀同学。" + 
            "目前只支持文本消息，后期开放训练接口，且会加上阿耀同学的个性回复。" +
            "敬请期待。" ;
        
        send_txt_msg(xml_obj.ToUserName, xml_obj.FromUserName, 
                     text, response) ;
    }else {
        weixin_msg_not_supported(xml_obj.ToUserName, 
                                 xml_obj.FromUserName, response) ;
    }
}


function start() {
    function onRequest(request, response) {
        
        request.setEncoding("utf8") ;
        var pathname = url.parse(request.url).pathname ;
        
        // GET请求处理，目前只处理验证消息
        if (request.method == "GET") {
            var qstring = url.parse(request.url).query ;
            route_get(pathname, qstring, response) ;


        }else if (request.method == "POST") { // 处理POST消息
            var post_data = "" ;
            
            // 数据到达事件
            function data_callback(data_chunk) {
                post_data += data_chunk ;
            }

            // 数据接收完成事件
            function end_callback() {
                xml2js.parseString(post_data, xml_parse_callback) ;
            }

            // xml解析完毕回调
            function xml_parse_callback(err, xml_obj) {
                if (err) {
                    console.log("post data : not a valid xml") ;
                    uri_not_supported(response) ;
                } else {
                    msg_handle(xml_obj.xml, response) ;
                }
            }
            
            request.addListener("data", data_callback) ;
            request.addListener("end", end_callback) ;
        }
    }

    var ret = http.createServer(onRequest).listen(80) ;

    console.log("Server has started!!") ;
}

exports.start = start ;

start() ;