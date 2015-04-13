$(document).ready(function() {
    
	var user = JSON.parse($("#twitter-user").html());

    var Tweet = Backbone.Model.extend({
        escapeHTML: function(text) {
            return $('<div/>').text(text).html()
        },
        parse: function(tweet) {
            that = this;

            if (!(tweet.entities)) {
                return that.escapeHTML(tweet.text)
            }
    
            // This is very naive, should find a better way to parse this
            var index_map = {}
            
            $.each(tweet.entities.urls, function(i,entry) {
                index_map[entry.indices[0]] = [entry.indices[1], function(text) {return "<a href='"+that.escapeHTML(entry.url)+"'>"+that.escapeHTML(entry.display_url)+"</a>"}]
            })
            
            $.each(tweet.entities.hashtags, function(i,entry) {
                index_map[entry.indices[0]] = [entry.indices[1], function(text) {return "<a href='http://twitter.com/search?q="+escape("#"+entry.text)+"'>"+that.escapeHTML(text)+"</a>"}]
            })
            
            $.each(tweet.entities.user_mentions, function(i,entry) {
                index_map[entry.indices[0]] = [entry.indices[1], function(text) {return "<a title='"+that.escapeHTML(entry.name)+"' href='http://twitter.com/"+that.escapeHTML(entry.screen_name)+"'>"+that.escapeHTML(text)+"</a>"}]
            })
            
            $.each(tweet.entities.media || [], function(i,entry) {
                index_map[entry.indices[0]] = [entry.indices[1], function(text) {return "<a href='"+ entry.expanded_url + "' target='_blank'><img src='"+that.escapeHTML(entry.media_url_https || entry.media_url)+"' /></a>"}];
            });
            
            var result = ""
            var last_i = 0
            var i = 0
            
            // iterate through the string looking for matches in the index_map
            for (i=0; i < tweet.text.length; ++i) {
                var ind = index_map[i]
                if (ind) {
                    var end = ind[0]
                    var func = ind[1]
                    if (i > last_i) {
                        result += that.escapeHTML(tweet.text.substring(last_i, i))
                    }
                    result += func(tweet.text.substring(i, end))
                    i = end - 1
                    last_i = end
                }
            }
            
            if (i > last_i) {
                result += that.escapeHTML(tweet.text.substring(last_i, i))
            }
        

            tweet = _.extend(tweet, {
                id: tweet.id_str,
                displayText: result
            });
            return tweet;
        }
    });

    var TweetCollection = Backbone.Collection.extend({
        model: Tweet,
        url: "/tweets"
    });
    tweets = new TweetCollection;
	
    var TwitterUserProfileView = Backbone.View.extend({
        el: $("#twitter-user-profile"),
        initialize: function(){
            _.bindAll(this, 'render');
            this.render();
        },
        render: function(){
            var template = _.template( $("#twitter-user-profile-template").html());
            this.$el.html( template(user) );
        }
    });
	var userNavView = new TwitterUserProfileView();


    var TweetsView = Backbone.View.extend({
        filterTimeout: 0,
        selectedCount: 0,
        minId: null,
        maxId: null,
        el: $("body"),
        els: {
            query: $('#q'),
            until: $('#until')
        },
        events: {
            'click #fetch-prev' : 'prev',
            'click #fetch' : 'search',
            'click blockquote.twitter-tweet': 'toggleTweet',
            'click blockquote.twitter-tweet .delete': 'deleteTweet',
            'click #all': 'toggleCheckboxes',
            'click #delete': 'deleteSelectedTweets',
            'keyup #filter': 'triggerFilterTimeout'
        },
        initialize: function(){
            _.bindAll(this, 'render');
            $('[data-toggle="tooltip"]').tooltip();
        },
        render: function(){
            $('#tweet-list').html('');
            var template = _.template( $("#tweet-container").html());
            var filtered =  _.filter(tweets.models, function(e){
                var filterText = $('#filter').val().trim();
                if(filterText!=""){
                    return e.get('displayText').search(new RegExp(filterText, "i")) > -1;
                }
                return true;
            });
            _.each(
                filtered, function(e,i){
                $('#tweet-list').append(template(e.attributes));

                // Twitterize
                // twttr.widgets.createTweet(
                //     e.id,
                //     $('#tweet' + e.id)[0]
                // );
            });


            this.minId = _.min(tweets.models, function(tweet){
                return tweet.id;
            });

            this.maxId = _.max(tweets.models, function(tweet){
                return tweet.id;
            });

            var minDate = new Date(Date.parse(this.minId.get('created_at')));
            var maxDate = new Date(Date.parse(this.maxId.get('created_at')));
            $('#date-range').html(
                maxDate.toDateString() + ' - ' + minDate.toDateString()
            );

            // set the max id in the form, url, and cookie
            $('#max_id').val(this.minId.id);

            $.each($('.timestamp'), function(i,e){
                var e = $(e);
                var d = new Date(Date.parse(e.html()));
                e.html(d.toString());
            });

            
        },
        prev: function() {
            var that = this;
            tweets.reset();
            tweets.fetch({
                data: {
                    count: $('#count').val(),
                    since_id: that.maxId.id,
                    max_id: null
                },
                beforeSend: function(){
                    $('#tweet-list').html('<img src="img/ajax-loader.gif" />');
                },
                success: function(data) {
                    $('#tweet-list').html('');
                    that.render();
                    that.toggleDeleteButton();
                },
                error: function() {
                    // alert('error');
                }
            });
        },
        search: function() {
            var that = this;
            tweets.reset();
            tweets.fetch({
                data: {
                    count: $('#count').val(),
                    max_id: $('#max_id').val()
                },
                beforeSend: function(){
                    $('#tweet-list').html('<img src="img/ajax-loader.gif" />');
                },
                success: function(data) {
                    $('#tweet-list').html('');
                    that.render();
                    that.toggleDeleteButton();
                },
                error: function() {
                    // alert('error');
                }
            });
        },
        toggleTweet: function(e) {
            var target = $(e.target);
            target = $('#tweet' + target.data('id'));
            if(target.hasClass('selected')){
                target.removeClass('selected');
                target.find('input[type=checkbox]').prop('checked', false);
            } else {
                target.addClass('selected');
                target.find('input[type=checkbox]').prop('checked', true);
            }
            this.toggleDeleteButton();
        },
        toggleCheckboxes: function(e) {
            $.each($('blockquote.twitter-tweet'), function(i, target){
                target = $(target);
                if(!e.target.checked){
                    target.removeClass('selected');
                    target.find('input[type=checkbox]').prop('checked', false);
                } else {
                    target.addClass('selected');
                    target.find('input[type=checkbox]').prop('checked', true);
                }    
            });
            this.toggleDeleteButton();
        },
        toggleDeleteButton: function() {
            var that = this;
            that.selectedCount = 0;
            $.each($('blockquote.twitter-tweet'), function(i,e){
                that.selectedCount = $(e).hasClass('selected') ? that.selectedCount+1 : that.selectedCount
            });
            if(that.selectedCount > 0) {
                $('#delete-count').html(that.selectedCount);
                $('#delete').removeClass('disabled');
            } else {
                $('#delete-count').html('');
                $('#delete').addClass('disabled');
            }
        },
        triggerFilterTimeout: function() {
            var that = this;
            if( this.filterTimeout != null) {
                clearTimeout(this.filterTimeout);
            }
            this.filterTimeout = setTimeout(function(){
                that.render();
            }, 180);
            
        },
        /** @param tweet TweetModel */
        delete: function(tweet) {
            var that = this;
            tweet.destroy({
                success: function(data){
                    //remove from DOM
                    $('#tweet' + data.id).fadeOut(500, function(){
                        $('#tweet' + data.id).remove();
                    });
                    that.selectedCount--;
                    $('#delete-count').html(that.selectedCount > 0 ? that.selectedCount : '');
                    if(that.selectedCount==0) {
                        $('#delete').addClass('disabled');
                    }
                },
                error: function(error){
                    console.log(error);
                }
            });
        },
        deleteTweet: function(e) {
            var target = $(e.target);
            var tweet = tweets.get(target.data('id'));
            this.delete(tweet);
        },
        deleteSelectedTweets: function(e) {
            var that = this;
            $.each($('blockquote.twitter-tweet'), function(i,t){
                t = $(t);
                if(t.hasClass('selected')){
                    var tweet = tweets.get(t.data('id'));
                    that.delete(tweet);
                }
            });
        }
    });
    var tweetsView = new TweetsView();
    tweetsView.search();

});

