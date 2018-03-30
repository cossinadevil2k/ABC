! function($) {

	var winurl = window.location.href.replace(/([^\#]*)(.*)/, '$1');

	window.reflow = function() {
		if ('ontouchstart' in window) {
			document.documentElement.style.width = (document.documentElement.offsetWidth + 1) + 'px';
			setTimeout(function() {
				document.documentElement.style.width = '';
			}, 0);
		}
	};

	$('.navbar ul li a').each(function() {
		var href = this.href,
			target = this.hash ? this.hash : href.replace(/.*(?=#[^\s]+$)/, ''),
			target_url = href.replace(/([^\#]*)(.*)/, '$1');

		if (this.hostname != window.location.hostname || target.substr(0, 1) != '#') {
			return;
		}

		$(this).attr('href', target).data('target', target);
	});

	$('.navbar ul li a').click(function(e) {
		if (!$(this).data('target')) {
			return;
		}

		var target = this.href.replace(/.*(?=#[^\s]+$)/, '');
		if (target && ($(target).length)) {
			e.preventDefault();

			$('html,body').animate({
				scrollTop: Math.max(0,
					$(target).offset().top - ((!($('html').hasClass('off-canvas') && $('.btn-navbar').is(':visible')) && $('#ja-header').css('position') == 'fixed') ? $('#ja-header').height() : 0) + 2)
			}, {
				duration: 800,
				easing: 'easeInOutCubic',
				complete: window.reflow
			});
		} else { //not found
			var home = $('.navbar ul li a.home').attr('href');
			if (home) {
				window.location.href = home.replace(/([^\#]*)(.*)/, '$1') + target;
			}
		}
	});

	$(document).ready(function() {
		var ftarget = window.location.href.replace(/.*(?=#[^\s]+$)/, '');

		if (ftarget.substr(0, 1) == '#') {
			ftarget = $(ftarget);

			if (ftarget.length) {
				$('html,body').scrollTop(Math.max(0, ftarget.offset().top - ((!($('html').hasClass('off-canvas') && $('.btn-navbar').is(':visible')) && $('#ja-header').css('position') == 'fixed') ? $('#ja-header').height() : 0) + 1));
				window.reflow();
			}
		}

		var homelink = $('.navbar ul li a.home')[0];
		if (homelink) {
			var home_url = homelink.href.replace(/([^\#]*)(.*)/, '$1'),
				home_target = homelink.hash ? homelink.hash : homelink.href.replace(/.*(?=#[^\s]+$)/, '');

			if (home_url == winurl) {
				if (home_target.substr(0, 1) != '#') {
					homelink.href = home_target = '#onepage-home';
					$(homelink).data('target', home_target);
				}

				home_target = $(home_target);
				if (!home_target.length) {
					home_target = $('<div id="onepage-home" style="width: 0; height: 0; visibility: hidden">').prependTo(document.body);
				}

			} else {
				home_target = null;
			}

			$(homelink).unbind('click').click(function(e) {

				if (home_target) {
					e.preventDefault();

					$('html,body').animate({
						scrollTop: Math.max(0, (home_target.offset().top - $('#ja-header').height() + 2))
					}, {
						duration: 800,
						easing: 'easeInOutCubic',
						complete: window.reflow
					});
				}
			});
		}
	});
}(window.jQuery);