<?php
/**
 * @version    $Id$
 * @package    JSN_EasySlider
 * @author     JoomlaShine Team <support@joomlashine.com>
 * @copyright  Copyright (C) 2012 JoomlaShine.com. All Rights Reserved.
 * @license    GNU/GPL v2 or later http://www.gnu.org/licenses/gpl-2.0.html
 *
 * Websites: http://www.joomlashine.com
 * Technical Support:  Feedback - http://www.joomlashine.com/contact-us/get-support.html
 */

defined('_JEXEC') or die('Restricted access');

/**
 * Slider template restAPI controller.
 *
 * @package  JSN_EasySlider
 * @since    1.0.0
 */
include(JPATH_BASE.'/components/com_easyslider/libraries/rest-server/RestServer.php');
//Import filesystem libraries. Perhaps not necessary, but does not hurt
jimport('joomla.filesystem.file');
jimport('joomla.filesystem.folder');

class JSNEasySliderControllerRestAPI extends JControllerForm
{
	protected $option = 'com_easyslider';
	protected $_type = 'default';

	public function __construct($config = array())
	{
		parent::__construct($config);
		$this->_app  = JFactory::getApplication();
		$this->_input  = $this->_app->input;
		$this->_config = JSNConfigHelper::get();
	}

	/**
	 * @return mixed|string data of request body
	 */
	public function getRequestBody(){
		$restServer = new RestServer('debug');
		$restServer->format = 'json';
		return $restServer->getData();
	}

	public function item(){
		$table = '#__jsn_easyslider_item_templates';		$method = $_SERVER['REQUEST_METHOD'];
		$post = $this->_input->getArray($_POST);

		$model = json_encode( $this->getRequestBody()) ;
		$array = explode( '/', $post['collection'] );
		$data = array();
		if(isset($array[0])) 	$data['collection_id'] = $array[0];
		if(isset($array[1])) 	$data['model_id'] = $array[1];
		$data['name'] = '';
		$data['type'] = $this->_type;
		if(!is_null($model)) $data['data'] = $model;
		switch ($method) {
			case 'GET':
				$this->controlGETMethod($data, $table);
				exit();
				break;
			case 'POST':
				$this->controlPOSTMethod($data, $table);
				exit();
				break;
			case 'PUT':
				$this->controlPUTMethod($data, $table);
				exit();
				break;
			case 'PATCH':
				$this->controlPATCHMethod($data, $table);
				exit();
				break;
			case 'DELETE':
				$this->controlDELETEMethod($data, $table);
				exit();
				break;
		}
		exit();
	}

	public function slide(){
		$table = '#__jsn_easyslider_slide_templates';
		$method = $_SERVER['REQUEST_METHOD'];
		$post = $this->_input->getArray($_POST);

		$model = json_encode( $this->getRequestBody()) ;
		$array = explode( '/', $post['collection'] );
		$data = array();
		if(isset($array[0])) 	$data['collection_id'] = $array[0];
		if(isset($array[1])) 	$data['model_id'] = $array[1];
		$data['name'] = '';
		$data['type'] = $this->_type;
		if(!is_null($model) && !empty($model)) $data['data'] = $model;
		switch ($method) {
			case 'GET':
				$this->controlGETMethod($data, $table);
				break;
			case 'POST':
				$this->controlPOSTMethod($data, $table);
				break;
			case 'PUT':
				$this->controlPUTMethod($data, $table);
				break;
			case 'PATCH':
				$this->controlPATCHMethod($data, $table);
				break;
			case 'DELETE':
				$this->controlDELETEMethod($data, $table);
				break;
		}
		exit();
	}

	/**
	 * @param array $data
	 * @param $table
	 * @return json
	 */
	public function controlPOSTMethod($data = array(), $table){
		if( !empty($data) && !isset($data['model_id']) )
		{
			$model = $this->getModel("restapi");
			$arr = $this->copyImagesToPlugin($data['data']);
			$data['data'] = $arr['data'];
			$images = $arr['images'];

			$results = $model->createNewModel($data, $table);
			if(!$results['status']){
				$this->deleteImages($images);
			}
			$this->sendRespone($results);
			exit();
		}
	}

	/**
	 * @param array $data
	 * @param $table
	 * @return json
	 */
	public function controlGETMethod($data = array(), $table){
		if( !empty($data) )
		{
			$model = $this->getModel("restapi");
			$results = $model->getData($data, $table);
			$this->sendRespone($results);
			exit();
		}
	}

	/**
	 * @param array $data
	 * @param $table
	 * @return json
	 */
	public function controlPUTMethod($data = array(), $table){
		if( !empty($data) )
		{
			$model = $this->getModel("restapi");
			$results = $model->updateModel($data, $table);
			$this->sendRespone($results);
			exit();
		}
	}

	/**
	 * @param array $data
	 * @param $table
	 * @return json
	 */
	public function controlPATCHMethod($data = array(), $table){
		if( !empty($data) )
		{
			$model = $this->getModel("restapi");
			$results = $model->updateModel($data, $table);
			$this->sendRespone($results);
			exit();
		}
	}

	/**
	 * @param array $data
	 * @param $table
	 * @return json
	 */
	public function controlDELETEMethod($data = array(), $table){
		if( isset($data['model_id']) )
		{
			$model = $this->getModel("restapi");
			$results = $model->deleteModel($data['model_id'], $table);
			$this->sendRespone($results);
			exit();
		}
	}

	/**
	 * @param $results
	 */
	public function sendRespone($results){
		if($results['status'])
			http_response_code(200);
			//header($_SERVER['SERVER_PROTOCOL'] . ' OK', true, 200);
		else
			http_response_code(500);
			//header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
		echo json_encode($results['data']);
		exit();
	}

	/**
	 * @param array $data
	 * @return array
	 */
	public function copyImagesToPlugin($data = array()){
		$images = array();
		$data = json_decode($data);
		if($data->backgroundImage->url != '')
		{
			$newImage = $this->copyImage(JPATH_ROOT . $data->backgroundImage->url, $images);
			if( !is_null( $newImage ) )
				$data->backgroundImage->url = $newImage;
		}
		if(!empty($data->items)){
			foreach ($data->items as &$item)
			{
				if($item->type == 'image' && $item->image->type == 'upload'){
					$newUrl = $this->copyImage(JPATH_ROOT . $item->image->url, $images);
					if(!is_null($newUrl)){
						$item->image->url = $newUrl;
					}
				}
			}
		}
		$data = json_encode($data);
		return array('data' => $data, 'images' => $images);
	}

	/**
	 * @param string $path
	 * @param array $images
	 * @return null|string
	 */
	public function copyImage($path = '', &$images = array() ){
		$file = pathinfo($path);
		$dest = JSNES_COPY_IMAGES_PLUGIN_PATH . $file['basename'];
		if(JFile::copy($path, $dest ) ){
			array_push($images, $dest );
			return JSNES_COPY_IMAGES_PLUGIN_URL . $file['basename'];
		}
		else
		{
			return null;
		}
	}

	public function deleteImages($images = array()){
		if(!empty($images)){
			foreach($images as  $image)
			{
				if (JFile::exists($image))
				{
					JFile::delete($image);
				}

			}
		}
	}

}
