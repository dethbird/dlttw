$(document).ready(function() {
	
	var user = JSON.parse($("#twitter-user").html());
	
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

    var SearchFormView = Backbone.View.extend({
        el: $("#search-form"),
        events: {
            'click #search' : 'search'
        },
        initialize: function(){
            _.bindAll(this, 'render');
            this.render();
        },
        render: function(){
            // var template = _.template( $("#search-form-template").html());
            // this.$el.html( template(user) );
        },
        search: function() {
            console.log('search');
        }
    });
    var searchForm = new SearchFormView();

});

