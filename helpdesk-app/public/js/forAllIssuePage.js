(function($){
    var Issues = function(){
        this.init();
    };

    Issues.prototype = {
        init: function(){
            $('[data-toggle="tooltip"]').tooltip();
            this._initSelectDom();

        },

        run: function(){
            this._loadIssues();
        },

        _initSelectDom: function(){
            this._emptyIssue = $('.emptyIssue');

            this._messageContent;
            this._btnEnter;
            this._checkboxEnterBtn;
        },

        _loadIssues: function(){
            var self = this;

            this._ajaxListIssue(function(error, data){
                if(error){
                    console.log(error);
                } else {
                    self._setValueTable(data);
                }
            });
        },

        _ajaxListIssue: function(callback){
            var callbackSuccess = function(data){
                if (data.s) {
                    callback(null, data.d);
                } else {
                    callback('GetListIssueError');
                }
            };

            var data = {
                skip: 0,
                limit: 1000
            };

            $.ajax({
                method: 'POST',
                url: '/helpdesk/issue/get',
                data: JSON.stringify(data),
                dataType: 'json',
                contentType: 'application/json',
                success: callbackSuccess,
                error: function(){
                    alertErr(204);
                }
            });
        },

        // Show issue to DOM
        _setValueTable: function(data){
            var self = this;
            var dataLength = data.length;

            var onLoadInitModal = function(i){
                // console.log(i);
                if(i === 0) {
                    // self._modalState = true;
                    self.initModal();
                }
            };

            $('#pattern .list').empty();

            $.each(data, function(i, oneIssue){
                var title = oneIssue.name;
                var date = self._filterDateTime(oneIssue.report_date, 'onlydate');
                var idIssue = oneIssue._id;
                if (oneIssue.metadata) {
                    var os = oneIssue.metadata.os;
                } else {
                    var os = 'unknown';
                }

                self._parseDataDom(title, idIssue, os, date);
                onLoadInitModal(--dataLength);
            });
            // self._getContentIssue(idIssue, function(err, data){
            //     onLoadInitModal(--dataLength);
            //
            //    if (err) {
            //         self._emptyIssue(); //if have no issue, display instructions
            //    } else {
            //        self._parseDataDom(title, idIssue, os);
            //    }
            // });
        },
        _getContentIssue: function(issueID, callback){
            var callbackSuccess = function(data){
                if (!data.s) {
                    callback('GetIssueContentError');
                } else {
                    callback(null, data.d);
                }
            };

            var data = {
                iid: issueID
            };

            $.ajax({
                method: 'POST',
                url: '/helpdesk/message/get',
                data: JSON.stringify(data),
                dataType: 'json',
                contentType: 'application/json',
                success: callbackSuccess,
                error: function(){
                    alertErr(204);
                }
            });
        },

        _contentWhose: function(listContent){
            var sendDateLastMessage = listContent[listContent.length - 1].send_date;//get date of last message

            this._getAllContent(listContent, sendDateLastMessage);
        },

        _parseDataDom: function(title, idIssue, os, date){
            var pl = ['Android', 'iOS','Mac', 'Windows', 'Windows Phone'];
            if (os) {
                if (pl.indexOf(os) == -1) {
                    os = 'issue';
                }
            } else {
                os = 'issue';
            }

            $('#pattern .list').append('<li id='+idIssue+'>'
                    + '<span class="inner">'
                    +       '<div class="li-img"><img src="images/'+os+'.png" alt="Image Alt Text"   /></div>'
                    +       '<div class="li-text">'
                    +           '<h4 class="li-head">'+title+'</h4>'
                    +           '<p class="li-sub"></p>'
                    +           '<p class="timeLastMessage">'+date+'</p>'
                    +       '</div>'
                    +'</span></li>');
        },
        _emptyIssue: function(){
            if($('.list li').length > 0){
                this._emptyIssue.addClass('hidden')
            } else {
                this._emptyIssue.removeClass('hidden')
            }
        },

        _getAllContent(listContent, sendDateLastMessage){
            var that = this;
            $('.bubbleContent').empty();

            var lastDate = this._filterDateTime(sendDateLastMessage, 'dateandtime');
            $('.titleIssueModal .lastMessage').text('Last message: ' + lastDate);

            $.each(listContent, function(i, content){
                if(content.user) {
                    $('.bubbleContent').append('<div class="messageUser hvr-bubble-float-right">'+content.content+'</div>')
                } else if (content.mod) {
                    $('.bubbleContent').append('<div class="messageAdmin hvr-bubble-float-left">'+content.content+'</div>')
                }

                if (i === listContent.length - 1) {
                    that._gotoBottom(); //go to newest message
                }
            });
        },
        // _getTimeAndContent: function(listContent, sendDateLastMessage){
        //     var idIssue = listContent.issue; //return id of this issue
        //     var lastContent = listContent[listContent.length - 1].content; //return content last message
        //     var data = {};
        //
        //     //wrap content
        //     if(lastContent.length > 44){
        //         data.content = lastContent.substring(0, 41) + '...';
        //     } else {
        //         data.content = lastContent;
        //     }
        //     data.time = this._filterDateTime(sendDateLastMessage, 'onlydate');// return date
        //     return data
        // },

        _filterDateTime: function(date, details){
            var plainDate = new Date(date);
            var getDate = plainDate.toLocaleDateString();
            var getTime = plainDate.toLocaleTimeString();
            if (details === 'onlydate') {
                return getDate;
            } else if (details === 'dateandtime') {
                return getDate + ' ('+getTime+')';
            }
        },

        _gotoBottom: function (){
            $('.modal-body-show-content').animate({
                scrollTop: 9999
            }, 2000);
        },

        // Modal
        initModal: function(){
            // console.log('Init modal');

            var self = this;
            var Modal = $('#getContentIssueModal');

            var idIssue, title, titleElm;

            titleElm = titleElm || $('.titleIssueModal span');
            self._messageContent = self._messageContent || $('#messageContent');
            self._btnEnter = self._btnEnter || $('#sendNewMessage');
            self._checkboxEnterBtn = self._checkboxEnterBtn || $('#checkboxEnterSend');

            $('body').on('click', '#pattern .list li', function(){
                idIssue = $(this).attr('id');
                title = $(this).find('.li-head').text().trim();
                self._getContentIssue(idIssue, function(err, data){
                    if (!err) {
                        self._contentWhose(data);
                    } else {

                    }
                });

                Modal.modal('show');
            });



            $('#getContentIssueModal').on('shown.bs.modal', function (e) {
                titleElm.text(title);

                self._checkboxEnterBtn.toggle(true);
                self._messageContent.val('');
                self._btnEnter.attr('data-id', idIssue);
            });

            self._checkboxEnterSend();
            self._listenMessageContent();
            self._listenEnterClick();

        },

        _checkboxEnterSend: function(){
            var self = this;

            this._checkboxEnterBtn.on('click', function(){
                if ($(this).prop("checked")) {
                    self._btnEnter.addClass('hidden');
                } else {
                    self._btnEnter.removeClass('hidden')
                }
            });
        },
        _listenMessageContent: function(){
            var self = this;

            this._messageContent.on('keypress', function(e){
                if(!self._btnEnter.is(':visible')
                    && e.which == 13
                    && !e.shiftKey
                    && self._messageContent.val()) {

                    e.preventDefault();
                    self._sendMessage();

                } else {
                    //e.preventDefault();
                }

                if ($(this).val()) {
                    self._btnEnter.attr('disabled', false);
                } else {
                    self._btnEnter.attr('disabled', true);
                }
            });
        },
        _listenEnterClick: function(){
            var self = this;
            self._btnEnter.on('click', function(){

                self._sendMessage();
            });
        },
        _sendMessage: function(){
            var self = this;
            var message = this._messageContent.val();
            var id = self._btnEnter.attr('data-id');
            if (message && id) {
                self._ajaxSendMessage(message, id, function(err, data){
                   if (!err) {
                       self._sendMessageSuccess(id);
                   } else {

                   }
                });
            }
        },
        _ajaxSendMessage: function(message, id, callback){
            var callbackSuccess = function(data){
                if (data.s) {
                    callback(null, data.d);
                } else {
                    callback('SendMessageError');
                }
            };

            var data = {
                iid: id,
                c: message
            };

            $.ajax({
                method: 'POST',
                url: '/helpdesk/message/add',
                data: JSON.stringify(data),
                dataType: 'json',
                contentType: 'application/json',
                success: callbackSuccess,
                error: function(){
                    alertErr(204);
                }
            })

        },
        _sendMessageSuccess: function(id){
            var self = this;
            self._messageContent.val('');
            self._getContentIssue(id, function(err, data){
                if (err) {
                    $('.errLoadContent').removeClass('hidden');
                } else {
                    self._contentWhose(data);
                }
            });
        }
    };

    var Issue = new Issues();
    Issue.run();
})(jQuery);
