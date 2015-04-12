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
        el: $("body"),
        els: {
            query: $('#q'),
            until: $('#until')
        },
        events: {
            'click #fetch' : 'search',
            'click blockquote.twitter-tweet': 'toggleTweet',
            'click blockquote.twitter-tweet .delete': 'deleteTweet',
            'click #all': 'toggleCheckboxes'
        },
        initialize: function(){
            _.bindAll(this, 'render');
            $('[data-toggle="tooltip"]').tooltip();
        },
        render: function(){
            var template = _.template( $("#tweet-container").html());
            _.each(tweets.models, function(e,i){
                $('#tweet-list').append(template(e.attributes));

                // Twitterize
                // twttr.widgets.createTweet(
                //     e.id,
                //     $('#tweet' + e.id)[0]
                // );
            });


            var minId = _.min(tweets.models, function(tweet){
                return tweet.id;
            });

            var maxId = _.max(tweets.models, function(tweet){
                return tweet.id;
            });

            // set the max id in the form, url, and cookie
            $('#max_id').val(minId.id);

            $.each($('.timestamp'), function(i,e){
                var e = $(e);
                var d = new Date(Date.parse(e.html()));
                e.html(d.toString());
            });

            
        },
        search: function() {
            var that = this;
            tweets.fetch({
                data: {
                    count: 50,
                    max_id: $('#max_id').val()
                },
                beforeSend: function(){
                    $('#tweet-list').html('<img src="img/ajax-loader.gif" />');
                },
                success: function(data) {
                    $('#tweet-list').html('');
                    that.render();
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
            var c = 0;
            $.each($('blockquote.twitter-tweet'), function(i,e){
                console.log($(e).hasClass('selected'));
                c = $(e).hasClass('selected') ? c+1 : c;
            });
            if(c > 0) {
                $('#delete').removeClass('disabled');
            } else {
                $('#delete').addClass('disabled');
            }
        },
        deleteTweet: function(e) {
            var target = $(e.target);
            var tweet = tweets.get(target.data('id'));
            tweet.destroy({
                success: function(data){
                    //remove from DOM
                    $('#tweet' + data.id).fadeOut(500);
                },
                error: function(error){
                    console.log(error);
                }
            });
        }
    });
    var tweetsView = new TweetsView();
    tweetsView.search();

});
