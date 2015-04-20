$(window).ready(function() {

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
    maxTweetHistory = [];


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
        maxTweetHistory: maxTweetHistory,
        el: $("body"),
        els: {
            query: $('#q'),
            until: $('#until')
        },
        events: {
            'click #fetch-prev' : 'prev',
            'click #fetch' : 'next',
            'click blockquote.twitter-tweet': 'toggleTweet',
            'click blockquote.twitter-tweet .delete': 'deleteTweet',
            'click #all': 'toggleCheckboxes',
            'click #delete': 'deleteSelectedTweets',
            'keyup #filter': 'triggerFilterTimeout',
            'change #count' : 'changeCount'
        },
        initialize: function(){
            _.bindAll(this, 'render');
            $('[data-toggle="tooltip"]').tooltip();
        },
        render: function(){
            $('#tweet-list').html('');
            var template = _.template( $("#tweet-container").html());
            this.updateTweetCount(tweets.models);
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

            // console.log(window.location);

            this.minId = _.min(tweets.models, function(tweet){
                return parseInt(tweet.id);
            });

            this.maxId = _.max(tweets.models, function(tweet){
                return parseInt(tweet.id);
            });

            var minDate = new Date(Date.parse(this.minId.get('created_at')));
            var maxDate = new Date(Date.parse(this.maxId.get('created_at')));
            $('#date-range').html(
                maxDate.toDateString() + ' - ' + minDate.toDateString()
            );

            // set the max id in the form, url, and cookie
            $('#max_id').val(this.minId.get('id'));

            var url = Qurl.create();
            url.query('max_id', this.maxId.get('id'));

            $.each($('.timestamp'), function(i,e){
                var e = $(e);
                var d = new Date(Date.parse(e.html()));
                e.html(d.toString());
            });

            // banners
            var banners = $('.banner');
            var bannerIndex = Math.floor(Math.random() * banners.length);
            $('.banner-container').html($(banners[bannerIndex]).html());

            $('.banner-container iframe').on('mouseover', function(){
                ga('send', 'event', "app", "banner-ad", "mouseover");
            });


        },
        changeCount: function(e) {
            var count = $('#count').val();
            var url = Qurl.create();
            url.query('count', count);
            ga('send', 'event', "app", "change-count", count);
        },
        prev: function() {
            var maxId = this.maxTweetHistory.pop();
            maxId = this.maxTweetHistory.pop();
            if(max_id) {
                $('#max_id').val(maxId);
                ga('send', 'event', "app", "prev", this.maxTweetHistory.length);
                this.next();
            } else {
                $('#fetch-prev').addClass('disabled');
            }
        },
        next: function(e) {
            var that = this;
            tweets.reset();
            tweets.fetch({
                data: {
                    count: $('#count').val(),
                    max_id: $('#max_id').val()
                },
                beforeSend: function(){
                    if(e!==undefined) {
                        ga('send', 'event', "app", "next", that.maxTweetHistory.length);
                    }
                    $('#tweet-list').html('<img src="img/ajax-loader.gif" />');
                },
                success: function(data) {


                    that.render();

                    if(that.maxTweetHistory.length > 0) {
                        $('#fetch-prev').removeClass('disabled');
                    }
                    that.maxTweetHistory.push(that.maxId.get('id'));

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
            ga('send', 'event', "app", "toggle-tweet", target.hasClass('selected') ? 'deselected' : 'selected');
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
                ga('send', 'event', "app", "toggle-all", e.target.checked ? 'selected' : 'deselected');
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
                ga('send', 'event', "app", "filter", $('#filter').val().trim());
                that.render();
            }, 180);

        },
        updateTweetCount: function(list) {
            var plural = list.length==1 ? '' : 's';
            $('#tweet-count').html(list.length + " tweet" + plural);
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
                    that.updateTweetCount(tweets.models);
                },
                error: function(error){
                    console.log(error);
                }
            });
        },
        deleteTweet: function(e) {
            ga('send', 'event', "app", "delete-tweet", JSON.stringify({screen_name: user.screen_name}));
            var target = $(e.target);
            var tweet = tweets.get(target.data('id'));
            this.delete(tweet);
            e.stopPropagation();
        },
        deleteSelectedTweets: function(e) {
            var that = this;
            var count = 0;
            $.each($('blockquote.twitter-tweet'), function(i,t){
                t = $(t);
                if(t.hasClass('selected')){
                    var tweet = tweets.get(t.data('id'));
                    that.delete(tweet);
                    count++;
                }
            });
            ga('send', 'event', "app", "delete-selected", JSON.stringify({screen_name: user.screen_name, count: count}));
        }
    });
    var tweetsView = new TweetsView();
    tweetsView.next();


});

