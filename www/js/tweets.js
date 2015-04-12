$(document).ready(function() {
	
	var user = JSON.parse($("#twitter-user").html());
    var TweetsCollection = Backbone.Collection.extend({
      url: "/tweets/search"
    });
    tweets = new TweetsCollection;
	
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
            'click #search' : 'search'
        },
        initialize: function(){
            _.bindAll(this, 'render');
            this.render();
        },
        render: function(){
            var template = _.template( $("#tweet-container").html());
            _.each(tweets.models, function(e,i){
                $('#tweet-list').append(template(e.attributes));
                // if(e.attributes.entities.urls[0]!==undefined) {}
                
                // Twitterize
                // twttr.widgets.createTweet(
                //     e.id,
                //     $('#tweet' + e.id)[0]
                // );
            })
            
        },
        search: function() {
            var that = this;
            tweets.fetch({
                data: {
                    count: 25
                },
                beforeSend: function(){
                    $('#tweet-list').html('<img src="img/ajax-loader.gif" />');
                },
                success: function(data) {
                    console.log(data);
                    $('#tweet-list').html('');
                    that.render();
                },
                error: function() {
                    // alert('error');
                }
            });
        }
    });
    var tweetsView = new TweetsView();
    tweetsView.search();

});

