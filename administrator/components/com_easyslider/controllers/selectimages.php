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
 * Slider template select images controller.
 *
 * @package  JSN_EasySlider
 * @since    1.0.0
 */
include(JPATH_BASE . '/components/com_easyslider/libraries/rest-server/RestServer.php');
//Import filesystem libraries. Perhaps not necessary, but does not hurt
jimport('joomla.filesystem.file');
jimport('joomla.filesystem.folder');

class JSNEasySliderControllerSelectImages extends JControllerForm
{
    protected $option = 'com_easyslider';
    protected $_type = 'default';

    public function __construct($config = array())
    {
        parent::__construct($config);
        $this->_app = JFactory::getApplication();
        $this->_input = $this->_app->input;
        $this->_config = JSNConfigHelper::get();
    }

    /**
     * @return mixed|string data of request body
     */
    public function getRequestBody()
    {
        $restServer = new RestServer('debug');
        $restServer->format = 'json';
        return $restServer->getData();
    }

    public function selectImages()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $post = $this->_input->getArray($_POST);

        $path = $post['path'];
        switch ($method)
        {
            case 'GET':
                $this->controlGETMethod($path);
                break;
//			case 'POST':
//				$this->controlPOSTMethod($data);
//				break;
//			case 'PUT':
//				$this->controlPUTMethod($data);
//				break;
//			case 'PATCH':
//				$this->controlPATCHMethod($data);
//				break;
//			case 'DELETE':
//				$this->controlDELETEMethod($data);
//				break;
        }
        exit();
    }

    /**
     * @param string $path
     */
    public function controlGETMethod($path = '')
    {
        $fullPath = JSNES_IMAGES_PATH . $path;

        //get list of  directory and file
        $listFiles = $this->getFiles($fullPath, $path);

        $listDir = $this->getDirectory($fullPath, $path);

        $results = array_merge($listDir, $listFiles);
        $this->sendRespone($results);
        exit();

    }

    public function getFiles($fullPath, $path)
    {
        $path       = JFolder::makeSafe($path);
        $data       = array();
        $extensions  = $this->_config->get('file_types');

        if (!$extensions) $extensions = 'jpeg,gif,png,jpg';
        $arrayExtension = explode(',', $extensions);
        $results = JFolder::files($fullPath, '.', false, false);
        foreach ($results as $result)
        {
            //get file's extension
            $extension = JFile::getExt($result);
            if (in_array($extension, $arrayExtension) &&  JFile::exists($fullPath . '/' .$result) ){
                array_push($data, array(
                        'filename' => basename($result),
                        'type' => 'file',
                        'url' => preg_replace('!/+!', '/', JSNES_IMAGES_URL . $path . '/' . basename($result))
                    )
                );
            }
        }
        return $data;
    }

    public function getDirectory($fullPath, $path)
    {
        $results = JFolder::folders($fullPath, '', false, false);

        $data = array();
        foreach ($results as $result)
        {
            //code to use if directory
            array_push($data, array(
                    'filename' => $result,
                    'type' => 'dir'
                )
            );
        }
        return $data;
    }

    /**
     * @param array $data
     * @return json
     */
    public function controlPOSTMethod($data = array())
    {
        if (!empty($data) && !isset($data['model_id']))
        {
            $model = $this->getModel("restapi");
            $arr = $this->copyImagesToPlugin($data['data']);
            $data['data'] = $arr['data'];
            $images = $arr['images'];

            $results = $model->createNewModel($data);
            if (!$results['status'])
            {
                $this->deleteImages($images);
            }
            $this->sendRespone($results);
            exit();
        }
    }


    /**
     * @param array $data
     * @return json
     */
    public function controlPUTMethod($data = array())
    {
        if (!empty($data))
        {
            $model = $this->getModel("restapi");
            $results = $model->updateModel($data);
            $this->sendRespone($results);
            exit();
        }
    }

    /**
     * @param array $data
     * @return json
     */
    public function controlPATCHMethod($data = array())
    {
        if (!empty($data))
        {
            $model = $this->getModel("restapi");
            $results = $model->updateModel($data);
            $this->sendRespone($results);
            exit();
        }
    }

    /**
     * @param array $data
     * @return json
     */
    public function controlDELETEMethod($data = array())
    {
        if (isset($data['model_id']))
        {
            $model = $this->getModel("restapi");
            $results = $model->deleteModel($data['model_id']);
            $this->sendRespone($results);
            exit();
        }
    }

    /**
     * @param $results
     */
    public function sendRespone($results)
    {
        http_response_code(200);
        echo json_encode($results);
        exit();
    }


}
