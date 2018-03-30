var $ja = jQuery.noConflict();

/*!
 * jQuery Cookie Plugin v1.3
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2011, Klaus Hartl
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */
(function($, document, undefined) {

	var pluses = /\+/g;

	function raw(s) {
		return s;
	}

	function decoded(s) {
		return decodeURIComponent(s.replace(pluses, ' '));
	}

	var config = $.cookie = function(key, value, options) {

		// write
		if (value !== undefined) {
			options = $.extend({}, config.defaults, options);

			if (value === null) {
				options.expires = -1;
			}

			if (typeof options.expires === 'number') {
				var days = options.expires,
					t = options.expires = new Date();
				t.setDate(t.getDate() + days);
			}

			value = config.json ? JSON.stringify(value) : String(value);

			return (document.cookie = [
				encodeURIComponent(key), '=', config.raw ? value : encodeURIComponent(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path ? '; path=' + options.path : '',
				options.domain ? '; domain=' + options.domain : '',
				options.secure ? '; secure' : ''
			].join(''));
		}

		// read
		var decode = config.raw ? raw : decoded;
		var cookies = document.cookie.split('; ');
		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			if (decode(parts.shift()) === key) {
				var cookie = decode(parts.join('='));
				return config.json ? JSON.parse(cookie) : cookie;
			}
		}

		return null;
	};

	config.defaults = {};

	$.removeCookie = function(key, options) {
		if ($.cookie(key) !== null) {
			$.cookie(key, null, options);
			return true;
		}
		return false;
	};

})(window.$ja, document);

! function($) {
	var supportsCanvas = !! document.createElement('canvas').getContext;

	if (!$.fn.jaload) {
		// blank image data-uri bypasses webkit log warning (thx doug jones)
		var blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

		$.fn.jaload = function(option) {
			var opts = $.extend({
				onload: false
			}, $.isFunction(option) ? {
				onload: option
			} : option),
				jimgs = this.find('img').add(this.filter('img')),
				total = jimgs.length,
				loaded = [],
				onload = function() {
					if (this.src === blank || $.inArray(this, loaded) !== -1) {
						return;
					}

					loaded.push(this);

					$.data(this, 'JAImgLoad', {
						src: this.src
					});
					if (total === loaded.length) {
						$.isFunction(opts.onload) && setTimeout(opts.onload);
						jimgs.unbind('.JAImgLoad');
					}
				};

			if (!total) {
				$.isFunction(opts.onload) && opts.onload();
			} else {
				jimgs.on('load.JAImgLoad error.JAImgLoad', onload).each(function(i, el) {
					var src = el.src,
						cached = $.data(el, 'JAImgLoad');

					if (cached && cached.src === src) {
						onload.call(el);
						return;
					}

					if (el.complete && el.naturalWidth !== undefined) {
						onload.call(el);
						return;
					}

					if (el.readyState || el.complete) {
						el.src = blank;
						el.src = src;
					}
				});
			}

			return this;
		};
	}


	function Grayscale(image) {
		if (supportsCanvas) {
			$(image).jaload(function() {
				var canvas = document.createElement('canvas'),
					context = canvas.getContext('2d'),
					imageData, px, length, i = 0,
					gray;

				canvas.width = image.naturalWidth ? image.naturalWidth : image.width;
				canvas.height = image.naturalHeight ? image.naturalHeight : image.height;

				context.drawImage(image, 0, 0);

				imageData = context.getImageData(0, 0, canvas.width, canvas.height);
				px = imageData.data;
				length = px.length;

				for (; i < length; i += 4) {
					//gray = px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11;
					//px[i] = px[i + 1] = px[i + 2] = gray;
					px[i] = px[i + 1] = px[i + 2] = (px[i] + px[i + 1] + px[i + 2]) / 3;
				}

				context.putImageData(imageData, 0, 0);
				image.src = canvas.toDataURL();

				$(image).css('opacity', 0).animate({
					opacity: 1
				}, 500);
			});
		}
	}

	$(window).load(function() {
		$('img.img-grayscale, .img-grayscale img, .ja-cp-image img').each(function() {
			$(this).wrap('<div style="display:inline-block;" class="gs-wrap"></div>')
				.clone().addClass('gotcolors').css({
					'position': 'absolute',
					'opacity': 0
				}).insertBefore(this);

			Grayscale(this);
		}).parent().hover(
			function() {
				$(this).find('.gotcolors').stop(true).animate({
					opacity: 1
				}, 700);
			},
			function() {
				$(this).find('.gotcolors').stop(true).animate({
					opacity: 0
				}, 500);
			}
		);

		if ($.fn.yoxview) {
			$(document).ajaxSuccess(function() {
				setTimeout(function() {
					$('.ja-cp-main .ja-cp-image img').not(function() {
						return $(this.parentNode).hasClass('gs-wrap');
					}).each(function() {
						$(this).wrap('<div style="display:inline-block;" class="gs-wrap"></div>')
							.clone().addClass('gotcolors').css({
								'position': 'absolute',
								'opacity': 0
							}).insertBefore(this);
						Grayscale(this);
					}).css('opacity', 0).animate({
						opacity: 1
					}, 500).parent().hover(
						function() {
							$(this).find('.gotcolors').stop(true).animate({
								opacity: 1
							}, 700);
						},
						function() {
							$(this).find('.gotcolors').stop(true).animate({
								opacity: 0
							}, 500);
						}
					);
				}, 50);
			});
		}

		$('#back-to-top').on('click', function() {
			$('html, body').stop(true).animate({
				scrollTop: 0
			}, {
				duration: 800,
				easing: 'easeInOutCubic',
				complete: window.reflow
			});

			return false;
		});

		$('.arrow-down, .btn-tpl-1').on('click', function() {
			if (window.location.href.replace(/([^\#]*)(.*)/, '$1') != this.href.replace(/([^\#]*)(.*)/, '$1')) {
				return true;
			}

			var target = this.hash ? this.hash : this.href.replace(/.*(?=#[^\s]+$)/, '');
			if (target.substr(0, 1) == '#') {
				target = $(target);

				$('html, body').stop(true).animate({
					scrollTop: Math.max(0, target.offset().top - ($('#ja-header').height() || 0) + 1)
				}, {
					duration: 800,
					easing: 'easeInOutCubic',
					complete: window.reflow
				});

				return false;
			}
		});

		setTimeout(function() {
			var cookie = $.cookie('jaopqktip');
			if (!cookie) {
				$('#ja-quick-tips').show().css('opacity', 0).fadeTo(700, 1).delay(3000).fadeTo(700, 0, function() {
					$(this).hide();
				});

				$.cookie('jaopqktip', 1);
			}
		}, 1000);

		//Check div system-message-container exist
		if (($("#system-message-container").html() || '').length > 1) {
			if (($("#system-message").html() || '').length > 1) {
				$("#system-message-container").show();
				$("#system-message-container").css({
					"padding-top": "60px"
				});
				$("#system-message a.close").click(function() {
					$("#system-message-container").hide();
				});
			} else {
				$("#system-message-container").hide();
			}
		} else {
			$("#system-message-container").hide();
		}

		setTimeout(function() {
			$(document.body).scrollspy('refresh');
		}, 1000);
	});

	$(document).ready(function() {
		var headHeight = $('#ja-header').outerHeight();
		if (headHeight) {
			$(document.body).attr('data-offset', headHeight).data('offset', headHeight);
		}
	});

	$(window).resize(function() {
		$(document.body).scrollspy('refresh');
	});
}(window.$ja || jQuery);

jQuery(document).ready(function() {
	var deviceUserAgent = window.navigator.userAgent;

	function parseDevice(string) {
		string = string.toLowerCase()
		if (string.search(/ipod|iphone|ipad/i) > -1) {
			jQuery('#images-qrcode').attr('src', '/ios.png');
			return '/#ios-device';
		} else if (string.search(/android/i) > -1) {
			jQuery('#images-qrcode').attr('src', '/android.png');
			return '/#android-device';
		} else if (string.search(/windows phone/i) > -1) {
			jQuery('#images-qrcode').attr('src', '/winphone.png');
			return '/#winphone-device';
		} else {
			return '/#money_lover_is_easy_to_get_started';
		}
	}

	function changeQRDownload(deviceUserAgent) {

	}

	jQuery('.download-moneylover').attr('href', parseDevice(deviceUserAgent));
});
