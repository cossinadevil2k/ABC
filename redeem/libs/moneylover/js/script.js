$(function(){
	// var root_uri = 'http://localhost:8800';
	var root_uri = 'https://nsfw.moneylover.me';
	var lockForm = false;
	var redeemCode = $('#redeem-code');
	var formName = $('#form-name');
	var formEmail = $('#form-email');
	var language = $('#form-language');

	redeemCode.focus();

	function validateEmail(email) {
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(email);
	}

	function lockRegister(){
		var d = new Date();
		d.setTime(d.getTime() + (1*60*60*1000));
		var expires = "expires="+d.toGMTString();
		document.cookie = "lockRegister=1; " + expires;
	}

	function isRegister(){
		return false;
		var name = "lockRegister=";
		var ca = document.cookie.split(';');
		for(var i=0; i<ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1);
			if (c.indexOf(name) != -1) return c.substring(name.length,c.length) ? true : false;
		}
		return false;
	}

	var validForm = function(data){
		var status = 0;
		if(!data.redeemCode){
			status += 1;
			$('.redeem-code .error').slideDown();
			$('.redeem-code .form-control').addClass('inp-error');
		} else {
			status -= 1;
			$('.redeem-code .error').slideUp();
			$('.redeem-code .form-control').removeClass('inp-error');
		}
		if(!data.formName || !data.formName.trim().length){
			status += 1;
			$('.form-name .error').slideDown();
			$('.form-name .form-control').addClass('inp-error');
		} else {
			status -= 1;
			$('.form-name .error').slideUp();
			$('.form-name .form-control').removeClass('inp-error');
		}
		if(!data.formEmail || !validateEmail(data.formEmail)){
			status += 1;
			$('.form-email .error').slideDown();
			$('.form-email .form-control').addClass('inp-error');
		} else {
			status -= 1;
			$('.form-email .error').slideUp();
			$('.form-email .form-control').removeClass('inp-error');
		}
		if (!grecaptcha.getResponse()) {
			status += 1;
		} else {
			status -=1;
		}
		return status === -4;
	};

	var submitRedeem = function(data, callback){
		if(!lockForm){
			$.ajax({
				url: root_uri + '/redeem/submit',
				contentType: 'application/json',
				data: data,
				dataType:'jsonp',
				beforeSend: function(xhr) {
					//Recaptcha.reload();
					lockForm = true;
				}
			}).done(function(data) {
				console.log(data);
				callback(true, data);
			}).fail(function() {
				callback(false, null);
			});
		}
	};

	$('#get-premium').click(function(){
		if(isRegister()){
			$('#modal-error').html('Bạn đang đăng kí với tốc độ ánh sáng xin vui lòng thử lại sau ít phút.');
			$('#money-error').modal('show');
		} else {
			var gRecaptchaResponse = grecaptcha.getResponse();
			var data = {
				redeemCode: redeemCode.val(),
				formName: formName.val(),
				formEmail: formEmail.val(),
				"g-recaptcha-response": gRecaptchaResponse,
				language: language.val() || 'en'
			};

			if(validForm(data)){
				submitRedeem(data, function(status, result){
					lockForm = false;
					if(status){
						if(!result.status && result.msg){
							$('#modal-error').html(result.msg);
							$('#money-error').modal('show');
						} else if(!result.status) {
							validForm(data);
						} else {
							$('#money-form-main').slideUp(function(){
								$('#money-form-success').fadeIn();
								lockRegister();
							});
						}
					} else {
						$('#modal-error').html('Hệ thống đang quá tải xin thử lại sau.');
						$('#money-error').modal('show');
					}
				});
			}
		}
	});
});
