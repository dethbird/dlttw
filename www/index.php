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
		$currentUri,
		$googleClient;


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

	use OAuth\Common\Http\Uri\UriFactory;
	use Guzzle\Http\Client;
	use OAuth\Common\Storage\Session;
	use GuzzleHttp\Subscriber\Oauth\Oauth1;
	use Google\Client as GoogleClient;

	// Basic functional classes
	$session = new Session();
	$uriFactory = new UriFactory();
	$currentUri = $uriFactory->createFromSuperGlobalArray($_SERVER);


	// Google client
	$googleClient = new Google_Client();
	$googleClient->setClientId($configs['google.client_id']);
	$googleClient->setClientSecret($configs['google.client_secret']);
	$googleClient->setScopes($configs['google.scopes']);
	$googleClient->setRedirectUri($configs['google.redirect_url']);
		
	// HTTP client
	$client = new Client($configs['api_url'], array(
	    "request.options" => array(
	       "headers" => array(
		       "auth_token" => isset($_SESSION['auth_token']) ? $_SESSION['auth_token'] : false
	       	)
	    )
	));



	// Twig Extension
	class AcmeExtension extends \Twig_Extension
	{
	    public function getFilters()
	    {
	        return array(
	            new \Twig_SimpleFilter('print_r', array($this, 'print_r')),
	            new \Twig_SimpleFilter('date_format', array($this, 'date_format')),
	            new \Twig_SimpleFilter('activity_name_label', array($this, 'activity_name_label')),
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
  

	    public function getName()
	    {
	        return 'acme_extension';
	    }


	    public function activity_name_label($activity_type_id, $acivity_types, $has_goal=null)
	    {
	    	$activity_type = $acivity_types[$activity_type_id];
	    	return '<span class="label" data-polarity-colorize="'.$activity_type['polarity'].'">'.
	    	$activity_type['name'].

	    	($has_goal=="Y" ? ' <span class="glyphicon glyphicon-'.($activity_type['polarity']>0?"star":"star-empty").'"></span>' : null).
	    	'</span>';
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
	$authCheck = function($app, $client) 
	{
		return function () use ( $app, $client ) 
		{
			global $configs;

			//if no auth token
			if (!isset($_SESSION['google_access_token'])) {
    			$app->redirect('/auth');
			}

		};
	};

	/**
	*  AUTH
	*/

	$app->get('/', $authCheck($app, $client), function () use ($app) {
	    // $app->redirect('/activity/add');
	    $app->redirect('/write');
	});


	$app->get('/auth', function () use ($app, $googleClient) {

		$app->render('partials/auth.html.twig', array(
	    	"section"=>$app->environment()->offsetGet("PATH_INFO"),
	    	"googleAuthUrl" => $googleClient->createAuthUrl()
    	));

	});

	$app->get('/logout', function () use ($app, $googleClient) {
		global $configs; 

		//clear cookies and session
		unset($_SESSION['user']);
		unset($_SESSION['auth_token']);
		session_destroy();
		$app->redirect('/auth');

	});


	/**
	*  VIEWS 
	*/

	$app->get('/write/new', $authCheck($app, $client), function () use ($app, $client) {

		$request = $client->post("/write", array(), array("current_document" => ""));
		$response = $request->send();
		$app->redirect('/write');
	});

	$app->get('/write', $authCheck($app, $client), function () use ($app, $client) {

		$response = json_decode($client->get('/user/token-auth')->send()->getBody(true));

	    $app->render('partials/write.twig', array(
	    	"section"=>"/write",
	    	"current_document"=>$response->data->current_document,
	    	"date_updated"=>$response->data->date_updated,
	    	"user" => $_SESSION['user']
    	));
	});

	$app->POST('/write', $authCheck($app, $client), function () use ($app, $client) {

		$request = $client->post("/write", array(), $app->request->params());
		$response = $request->send();
		echo $response->getBody(true);

	});




	$app->get('/proxy/:route', $authCheck($app, $client), function ($route) use ($app, $client) {

		$response = $client->get("/" . $route)->send();
		echo $response->getBody(true);

	});	


	/**
	*  OAUTH AUTH LINK 
	*/
	$app->get('/social/oauth/google', function () use ($app, $client, $googleClient) {
		header('Location: '.$googleClient->createAuthUrl());
	});

	



	/**
	*  OAUTH CALLBACK 
	*/

	$app->get('/social/oauth-callback/google', function () use ($app, $client, $googleClient) {

		global $configs;

		$googleClient->authenticate($_GET['code']);
		$accessToken = $googleClient->getAccessToken();
		$googleClient->setAccessToken($accessToken);

		$plus = new \Google_Service_Plus($googleClient);
		$person = $plus->people->get('me');

		$emails = $person->getEmails();
		$email = $emails[0]->value;

		$params = array(
			"name"=>$person->getDisplayName(),
			"email"=>$email
		);

		$client->setDefaultOption(
	       "headers",  array(
		       "auth_token" => $configs['app_auth_token']
	       	)
	    );

		$request = $client->post("/user", array(), $params);
		$response = $request->send();
		$response = json_decode($response->getBody(true));

		// echo "<pre>"; print_r($response); echo "</pre>"; die();

		$_SESSION['user'] = $response->data;
		$_SESSION['auth_token'] = $response->data->auth_token;
		$_SESSION['google_access_token'] = $accessToken;

		// echo "<pre>"; print_r($_SESSION); echo "</pre>"; die();

		// add flash message
		if(isset($_SESSION['user']->is_new)){
			$app->flash("success", "Account created");
		} else {
			$app->flash("success", "Logged in");
		}

		//create new activity
		if(isset($_SESSION['user']->is_new)){
			$app->redirect("/write/new");
		} else {
			$app->redirect("/write");
		}

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