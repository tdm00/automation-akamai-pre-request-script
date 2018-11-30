var AccessToken;
var BaseURL;
var ClientSecret;
var ClientToken;
var ReqType;
var ReqPath;
var Data;

// Pick up environment variables into credentials object
var credentials = {
  baseURL: postman.getEnvironmentVariable("baseURL"),
  accessToken: postman.getEnvironmentVariable("accessToken"),
  clientToken: postman.getEnvironmentVariable("clientToken"),
  clientSecret: postman.getEnvironmentVariable("clientSecret")
};

// Define variables for calling Akamai API
var endpoint = {
  method: request.method,
  host: credentials.baseURL,
  scheme: request.url.substring(0, request.url.indexOf("://")-1),
  reqPath: request.url.substring(request.url.indexOf(credentials.baseURL) + credentials.baseURL.length, request.url.length)
};

// Enhancing Date to have formatting functionality
Date.prototype.format = function(f) {
  if (!this.valueOf()) return " ";

  var weekName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var d = this;

  return f.replace(/(yyyy|yy|MM|dd|E|hh|mm|ss|a\/p)/gi, function($1) {
    switch ($1) {
      case "yyyy": return d.getFullYear();
      case "yy": return (d.getFullYear() % 1000).zf(2);
      case "MM": return (d.getMonth() + 1).zf(2);
      case "dd": return d.getDate().zf(2);
      case "E": return weekName[d.getDay()];
      case "HH": return d.getHours().zf(2);
      case "hh": return ((h = d.getHours() % 12) ? h : 12).zf(2);
      case "mm": return d.getMinutes().zf(2);
      case "ss": return d.getSeconds().zf(2);
      case "a/p": return d.getHours() < 12 ? "AM" : "PM";
      default: return $1;
    }
  });
};

// Utility functions for Date formatter
String.prototype.string = function(len){var s = '', i = 0; while (i++ < len) { s += this; } return s;};
String.prototype.zf = function(len){return "0".string(len - this.length) + this;};
Number.prototype.zf = function(len){return this.toString().zf(len);};

// Generating GUID
var guid = (function() {
  function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
  return function() { return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4(); };
})();

// Generate Akamai signature Data
function generateSignatureData(ReqType,BaseURL,ReqPath,Data,ClientToken,AccessToken,TimeStamp,Nonce) {
  var SignatureData = ReqType + String.fromCharCode(9);
  SignatureData += "https" + String.fromCharCode(9);
  SignatureData +=  BaseURL + String.fromCharCode(9);
  SignatureData +=  ReqPath +  String.fromCharCode(9);
  if ((ReqType == "POST") || (ReqType == "PUT")) {
    //SignatureData += String.fromCharCode(9) + CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(Data)) + String.fromCharCode(9);
    SignatureData += String.fromCharCode(9) + CryptoJS.SHA256(Data).toString(CryptoJS.enc.Base64) + String.fromCharCode(9);
  }
  SignatureData += "EG1-HMAC-SHA256 ";
  SignatureData += "client_token=" + ClientToken + ";";
  SignatureData += "access_token=" + AccessToken + ";";
  SignatureData += "timestamp=" + TimeStamp  + ";";
  SignatureData += "nonce=" + Nonce + ";";
  return SignatureData;
}

// Generate Authorization Header - Result of this function have to set into request header
function generateAuthorizationHeader(ClientToken,AccessToken,TimeStamp,Nonce,Signature) {
  var AuthorizationHeader = "EG1-HMAC-SHA256 ";
  AuthorizationHeader += "client_token=" + ClientToken + ";";
  AuthorizationHeader += "access_token=" + AccessToken + ";";
  AuthorizationHeader += "timestamp=" + TimeStamp + ";";
  AuthorizationHeader += "nonce=" + Nonce + ";";
  AuthorizationHeader += "signature=" + Signature;

  return AuthorizationHeader;
}

// Generate Hash - Using sandbox CryptoJS library
function generateHash(key,data) {
  var signature = CryptoJS.HmacSHA256(data, key);
  signature = signature.toString(CryptoJS.enc.Base64);

  return signature;
}

// Send request to API endpoint
function submitRequest() {
  ClientToken = credentials.clientToken;
  AccessToken = credentials.accessToken;
  BaseURL = credentials.baseURL;
  ClientSecret = credentials.clientSecret;
  ReqPath = endpoint.reqPath;
  ReqType = endpoint.method;
  Data = request.data;

  var d = new Date();
  var month = d.getUTCMonth()+1;
  var TimeStamp = d.getUTCFullYear() + month.zf(2) + d.getUTCDate().zf(2) + "T" + d.getUTCHours().zf(2) + ":" + d.getUTCMinutes().zf(2) + ":" + d.getUTCSeconds().zf(2) + "+0000";
  var Nonce = guid();
  var SignatureData = generateSignatureData(ReqType,BaseURL,ReqPath,Data,ClientToken,AccessToken,TimeStamp,Nonce);
  var SigningKey = generateHash(ClientSecret,TimeStamp);
  var Signature = generateHash(SigningKey,SignatureData);
  var AuthorizationHeader = generateAuthorizationHeader(ClientToken,AccessToken,TimeStamp,Nonce,Signature);

  // Add created authorization header as a Header of postman collecitons
  postman.setEnvironmentVariable('authorizationHeader', AuthorizationHeader);
}

submitRequest();
