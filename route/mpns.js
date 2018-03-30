var mpns = require('mpns');

var pushUri = 'http://s.notify.live.net/u/1/sin/HmQAAABV_1a01CXXkUCzepS4LqS8--CEnf98LiwLldSk3DcPieWCWaalLOkKKhlKCoblqjNpToHtCWy1sjmPOjqWUQXw/d2luZG93c3Bob25lZGVmYXVsdA/yOLwq-QCekO-SzXOXzhLNg/IOPHy5R3jBGIeyNkUq7NioTBICI';

mpns.sendToast(pushUri, 'Bold Text', 'This is normal text', function(err, data){});

// Optional callback
// mpns.sendToast(pushUri, text1, text2, callback);