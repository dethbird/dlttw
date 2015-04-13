<?php

	/**
	* 
	*    _____                                 __                
  	*   /  _  \ ______ ______     ______ _____/  |_ __ ________  
 	*  /  /_\  \\____ \\____ \   /  ___// __ \   __\  |  \____ \ 
	* /    |    \  |_> >  |_> >  \___ \\  ___/|  | |  |  /  |_> >
	* \____|__  /   __/|   __/  /____  >\___  >__| |____/|   __/ 
	*         \/|__|   |__|          \/     \/           |__|    
	*/
	
	ini_set('error_reporting', E_ALL);
	ini_set('display_errors', 1);
	define("APPLICATION_PATH", __DIR__ . "/..");
	// date_default_timezone_set('America/New_York');
	date_default_timezone_set('America/New_York');

	ini_set("session.gc_maxlifetime", "3600");
	session_start();

	global $configs,
		$session,
		$logger,
		$client,
		$currentUri;


	//read env file
	// # just points to environment config yml
	$env = parse_ini_file("../env.ini");
	$configs = parse_ini_file($env['config_file']);

	/**
	* __________               __                                
	* \______   \ ____   _____/  |_  __________________  ______  
 	* |    |  _//  _ \ /  _ \   __\/  ___/\_  __ \__  \ \____ \ 
 	* |    |   (  <_> |  <_> )  |  \___ \  |  | \// __ \|  |_> >
 	* |______  /\____/ \____/|__| /____  > |__|  (____  /   __/ 
	*         \/                        \/             \/|__|    
	*/
	
	require '../vendor/autoload.php';
	require_once '../lib/logger.php';

    
    use OAuth\Common\Consumer\Credentials;
	use OAuth\Common\Http\Uri\UriFactory;
	use OAuth\Common\Storage\Session;
	use Guzzle\Http\Client;
    use OAuth\ServiceFactory;
    use OAuth1\Service\Twitter;
	use GuzzleHttp\Subscriber\Oauth\Oauth1;
	use tmhOAuth;

	// Basic functional classes
	$session = new Session();
	$uriFactory = new UriFactory();
	$currentUri = $uriFactory->createFromSuperGlobalArray($_SERVER);
    $oauthServiceFactory = new OAuth\ServiceFactory();


    //Twitter Oauth Client
    $credentials = new Credentials(
        $configs['twitter.key'],
        $configs['twitter.secret'],
        "http://" . $currentUri->getHost() . "/social/callback/twitter"
    );
    $twitterClient = $oauthServiceFactory->createService('twitter', $credentials, $session);


	// Twig Extension
	class AcmeExtension extends \Twig_Extension
	{
	    public function getFilters()
	    {
	        return array(
	            new \Twig_SimpleFilter('print_r', array($this, 'print_r')),
	            new \Twig_SimpleFilter('date_format', array($this, 'date_format')),
	            new \Twig_SimpleFilter('json_encode', array($this, 'json_encode')),
	            new \Twig_SimpleFilter('strip_tags', array($this, 'strip_tags')),
	            new \Twig_SimpleFilter('substr', array($this, 'substr'))
	        );
	    }

	    public function print_r($output)
	    {
	        return print_r($output,1);
	    }

	    public function date_format($date, $format = "F j, Y g:i:a")
	    {
	    	// echo $date; die();
	        return date($format, strtotime($date));
	    }

	    public function strip_tags($html)
	    {
	        return strip_tags($html);
	    }

	    public function substr($output, $from, $to)
	    {
	        return substr($output,$from,$to);
	    }


	    public function json_encode($object)
	    {
	        return json_encode($object);
	    }
  

	    public function getName()
	    {
	        return 'acme_extension';
	    }

	}

	$app = new \Slim\Slim(array(
    	'view' => new Slim\Views\Twig(),
    	'templates.path' => APPLICATION_PATH . '/view',
	));
	$view = $app->view();
	$view->parserExtensions = array(
	    new \Slim\Views\TwigExtension(),
	    new AcmeExtension()
	);


	/**
	* __________               __  .__                
	* \______   \ ____  __ ___/  |_|__| ____    ____  
 	* |       _//  _ \|  |  \   __\  |/    \  / ___\ 
 	* |    |   (  <_> )  |  /|  | |  |   |  \/ /_/  >
 	* |____|_  /\____/|____/ |__| |__|___|  /\___  / 
	*         \/                           \//_____/  	
	*/

	/**
	* Authentication should be run as middleware before each route
	*/
	$authCheck = function($app) 
	{
		return function () use ( $app ) 
		{
			global $configs;

			//if no auth token
			if (!isset($_SESSION['twitter_access_token'])) {
    			$app->redirect('/auth');
			}

		};
	};

	/**
	*  AUTH
	*/

	$app->get('/', $authCheck($app), function () use ($app) {
	    $app->redirect('/tweets');
	});


	$app->get('/auth', function () use ($app) {

		$app->render('partials/auth.html.twig', array(
	    	"section"=>$app->environment()->offsetGet("PATH_INFO")
    	));

	});

	$app->get('/logout', function () use ($app) {
		global $configs; 

		//clear cookies and session
		unset($_SESSION['user']);
		unset($_SESSION['twitter_auth_token']);
		session_destroy();
		$app->redirect('/auth');

	});


	/**
	*  VIEWS 
	*/

	$app->get('/tweets', $authCheck($app), function () use ($app, $configs) {

		if($app->request()->isAjax()) {
			$twitter_client = new \Guzzle\Http\Client('https://api.twitter.com/{version}', array(
	    		'version' => '1.1'
		    ));
		    $twitter_client->addSubscriber(new Guzzle\Plugin\Oauth\OauthPlugin(array(
			    'consumer_key' => $configs['twitter.key'],
			    'consumer_secret' => $configs['twitter.secret'],
			    'token' => $_SESSION['twitter_access_token'],
			    'token_secret' => $_SESSION['twitter_token_secret']
			)));

			$request = $twitter_client->get('statuses/user_timeline.json');
			$request->getQuery()->set('count', $_GET['count']);
			// $request->getQuery()->set('trim_user', 1);
			$request->getQuery()->set('exclude_replies', 1);
			$request->getQuery()->set('include_rts', 0);
			
			if(isset($_GET['since_id'])) {
				$request->getQuery()->set('since_id', $_GET['since_id']);
			}
			if($_GET['max_id']!="") {
				$request->getQuery()->set('max_id', $_GET['max_id']);
			}
			$request->getQuery()->set('screen_name', $_SESSION['user']->name);
			$response = $request->send();

			$app->response()->header('Content-Type', 'application/json');
			$app->response()->setBody($response->getBody(true));

		} else {

		    $app->render('partials/tweets.twig', array(
		    	"section"=>"/tweets",
		    	"user" => $_SESSION['user']
	    	));
		}
	});

	$app->delete('/tweets/:id', $authCheck($app), function ($id) use ($app, $configs) {
		$twitter_client = new \Guzzle\Http\Client('https://api.twitter.com/{version}', array(
    		'version' => '1.1'
	    ));
	    $twitter_client->addSubscriber(new Guzzle\Plugin\Oauth\OauthPlugin(array(
		    'consumer_key' => $configs['twitter.key'],
		    'consumer_secret' => $configs['twitter.secret'],
		    'token' => $_SESSION['twitter_access_token'],
		    'token_secret' => $_SESSION['twitter_token_secret']
		)));

	    // $request = $twitter_client->get('statuses/show.json');
	    $request = $twitter_client->post('statuses/destroy.json');
	    $request->getQuery()->set('id', $id);
	    $response = $request->send();
		$app->response()->header('Content-Type', 'application/json');
		$app->response()->setBody($response->getBody(true));

	});


	// $app->POST('/write', $authCheck($app, $client), function () use ($app, $client) {

	// 	$request = $client->post("/write", array(), $app->request->params());
	// 	$response = $request->send();
	// 	echo $response->getBody(true);

	// });


	/**
	*  Twitter Auth
	*/
	$app->get('/social/oauth/twitter', function () use ($app, $twitterClient) {
		$token = $twitterClient->requestRequestToken();
   		$url = $twitterClient->getAuthorizationUri(array('oauth_token' => $token->getRequestToken()));
		header('Location: '.$url);
	});

	$app->get('/social/callback/twitter', function () use ($app, $twitterClient, $session) {
		
		if(!isset($_GET['oauth_token'])){
			$app->flash("error", "twitter not connected");
			$app->redirect("/auth");
		}
	    $token = $session->retrieveAccessToken('Twitter');
	    // This was a callback request from twitter, get the token
	    $t = $twitterClient->requestAccessToken(
	        $_GET['oauth_token'],
	        $_GET['oauth_verifier'],
	        $token->getRequestTokenSecret()
	    );
		if(!isset($t)){
			$app->flash("error", "Twitter not connected");
			$app->redirect("/auth");
		}
		
		// Send a request with it
    	$result = json_decode($twitterClient->request('account/verify_credentials.json'));

    	// Logger::log($result);

    	$_SESSION['user'] = $result;
		$_SESSION['twitter_access_token'] = $t->getAccessToken();
		$_SESSION['twitter_token_secret'] = $t->getAccessTokenSecret();
		
		$app->flash("success", "Twitter user ". $result->name ." connected!");
		$app->redirect("/tweets");
	});



	/**
	* __________            ._._._.
	* \______   \__ __  ____| | | |
 	* |       _/  |  \/    \ | | |
 	* |    |   \  |  /   |  \|\|\|	
 	* |____|_  /____/|___|  /_____
	*        \/           \/\/\/\/	
	*/
	$app->run();
?>