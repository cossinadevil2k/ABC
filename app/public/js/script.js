/*
	Script
*/


var MLApp = {};
(function($, _w, _d, a) {
	MLApp.init = function() {
		MLApp.Modal.init();
	};

	MLApp.Modal = {
		init: function() {
			this.importModal();
		},
		selections: {
			modal: $('#ML-MainModal'),
			header: $('.modal-header-text'),
			body: $('.modal-body'),
			footer: $('.modal-footer')
		},
		importModal: function() {
			$('body').append('<div id="ML-MainModal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="ML-MainModal" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><span class="modal-header-text"></span><button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button><h4 class="modal-title title"></h4></div><div class="modal-body clearfix"></div><div class="modal-footer"></div></div></div></div>');
		},
		show: function() {
			if ($('#ML-MainModal').is(':visible')) {
				$('#ML-MainModal').on('hidden.bs.modal', function(e) {
					$('#ML-MainModal').modal('show');
				});
			} else {
				$('#ML-MainModal').modal();
			}
		},
		hide: function() {
			$('#ML-MainModal').modal('hide');
		}
	};

	MLApp.http = {
		parseHttp: function(data, status) {
			if (status === 200) {
				if (data.status === 0) {
					$('.modal-header-text').html('Thông báo');
					$('.modal-body').html(data.msg);
					MLApp.Modal.show();
				} else {
					$('.modal-header-text').html('Lỗi');
					$('.modal-body').html(data.msg);
					MLApp.Modal.show();
				}
			} else {
				$('.modal-header-text').html('Error ' + status);
				$('.modal-body').html(data);
				MLApp.Modal.show();
			}
		},
		errorSv: function(err, data) {
			$('.modal-header-text').html('Error: ' + err);
			$('.modal-body').html(data);
			MLApp.Modal.show();
		}
	};

	MLApp.defaultHandler = {
		success: function(scope, rootScope, data) {

		},
		error: function(scope, rootScope, data, status) {

		},
		parseSuccess: function(data, scope) {

		}
	};

	MLApp.DatetimeUtils = null;

	$(document).ready(function() {
		MLApp.init();
	});
}(jQuery, window, document, angular));