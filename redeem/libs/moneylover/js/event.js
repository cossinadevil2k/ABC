$(function() {
    var root_uri = 'https://nsfw.moneylover.me/jsonp/update-discount';
    var email = getEmailFromLocation();

    if (email) {
        getDiscount(email, console.log);
    }
    
    function getDiscount(email, callback) {
        $.ajax({
				url: root_uri,
				contentType: 'application/json',
				data: {email: email},
				dataType:'jsonp',
				beforeSend: function(xhr) {
					
				}
			}).done(function(data) {
				callback();
			}).fail(function(err) {
				callback(err);
			});
    }

    function getEmailFromLocation() {
        let queries = location.search;

        if (!queries) return null;
        
        queries = queries.split('?')[1];
        queries = queries.split('&');
        
        for (var index = 0; index < queries.length; index++) {
            if (queries[index].indexOf('email=') > -1) {
                return queries[index].split('=')[1];
            }
        }

        return null;
    }
});