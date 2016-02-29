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
 * Slider controller.
 *
 * @package  JSN_EasySlider
 * @since    1.0.0
 */
//Import filesystem libraries. Perhaps not necessary, but does not hurt
jimport('joomla.filesystem.file');
jimport('joomla.filesystem.folder');

class JSNEasySliderControllerSlider extends JControllerForm
{
    protected $option = 'com_easyslider';

    public function __construct($config = array())
    {
        parent::__construct($config);
        $this->_app = JFactory::getApplication();
        $this->_input = $this->_app->input;
        $this->_config = JSNConfigHelper::get();
    }

    /**
     * Method to save a record.
     *
     * @param   string $key The name of the primary key of the URL variable.
     * @param   string $urlVar The name of the URL variable if different from the primary key (sometimes required to avoid router collisions).
     *
     * @return  boolean  True if successful, false otherwise.
     */
    public function save($key = null, $urlVar = null)
    {
        parent::save();

        $redirectUrl 		= $this->_input->get('redirect_url', '', 'STR');
        $redirectUrlForm 	= $this->_input->get('redirect_url_form', '', 'STR');
        $openArticle 		= $this->_input->get('open_article', '', 'STR');

        if ($redirectUrl)
        {
            $this->setRedirect(JRoute::_($redirectUrl, false), "");
        }

        if ($openArticle)
        {
            $this->setRedirect($this->redirect . '&opentarticle=open');
        }

        if ($redirectUrlForm)
        {
            $this->setRedirect($this->redirect . $redirectUrlForm);
        }
    }

    public function restAPI()
    {
        exit();
    }

    /**
     *
     * @param  image file data
     *
     * @return  json object.
     */

    public function ajaxUploadFiles()
    {
        $configMaxFileSize = ini_get('upload_max_filesize') > $this->_config->get('max_size_upload_file') ? $this->_config->get('max_size_upload_file') : ini_get('upload_max_filesize');
        $configMaxFileSize = $configMaxFileSize == 0 ? ini_get('upload_max_filesize') : $configMaxFileSize;
        $configMaxFileSize = is_numeric($configMaxFileSize) ? $configMaxFileSize : 5;
        $maxFilesize = $configMaxFileSize * 1024 * 1024;

        $result = array();
        $result['status'] = 'error';
        $result['max_size'] = $maxFilesize;
        $result['message'] = JText::_('JSN_EASYSLIDER_COULD_NOT_UPLOAD', true);

        //Retrieve file details from uploaded file, sent from upload form
        $file 		= $this->_input->files->get('file');
        $get 		= $this->_input->getArray($_GET);
        $sliderID 	= $get['slider_id'];
        $sliderPath = 'slider' . $sliderID . '/';
        //Clean up filename to get rid of strange characters like spaces etc
        $filename 	= JFile::makeSafe($file['name']);
        if (isset($filename))
        {
            //any errors the server registered on uploading
            $fileError = $file['error'];
            
            if ($fileError > 0)
            {
            	switch ($fileError)
            	{
            		case 1:
            			{
            				$result['error'] = JText::_('JSN_EASYSLIDER_ERROR_LARGE_FILE_PHP', true);
            				break;
            			}

            		case 2:
            			{
            				$result['error'] = JText::_('JSN_EASYSLIDER_ERROR_LARGE_FILE_HTML', true);
            				break;
            			}

            		case 3:
            			{
            				$result['error'] = JText::_('JSN_EASYSLIDER_ERROR_FILE_PARTIALLY', true);
            				break;
            			}
            		case 4:
            			{
            				$result['error'] = JText::_('JSN_EASYSLIDER_UPLOAD_ERROR_NO_FILE', true);
            				break;
            			}

            	}

                echo json_encode($result);
                exit();
            }

            //check for filesize
            $fileSize = $file['size'];
            if ($fileSize > $maxFilesize)
            {
                $result['error'] = JText::_('JSN_EASYSLIDER_UPLOAD_ERROR_FILESIZE_BIGGER', true);
                echo json_encode($result);
                exit();
            }

            //check the file extension is ok
            $fileName = $file['name'];
            $uploadedFileNameParts = explode('.', $fileName);
            $uploadedFileExtension = array_pop($uploadedFileNameParts);

            $fileType = !$this->_config->get('file_types') ? 'jpeg,jpg,png,gif' : $this->_config->get('file_types');
            $validFileExts = explode(',', $fileType);
            //assume the extension is false until we know its ok
            $check = false;

            //go through every ok extension, if the ok extension matches the file extension (case insensitive)
            //then the file extension is ok
            foreach ($validFileExts as $key => $value)
            {
                if (preg_match("/$value/i", $uploadedFileExtension))
                {
                    $check = true;
                }
            }

            if (!$check)
            {
                $result['error'] = JText::_('JSN_EASYSLIDER_INVALID_FILE_EXTENSION', true);
                echo json_encode($result);
                exit();
            }

            $fileTemp 	= $file['tmp_name'];
            $imageInfo 	= getimagesize($fileTemp);

            $validMineTypes = !$this->_config->get('mine_types') ? 'image/jpeg,image/pjpeg,image/png,image/x-png,image/gif' : $this->_config->get('mine_types');
            $validFileTypes = explode(",", $validMineTypes);

            if (!is_int($imageInfo[0]) || !is_int($imageInfo[1]) || !in_array($imageInfo['mime'], $validFileTypes))
            {
                $result['error'] = JText::_('JSN_EASYSLIDER_INVALID_FILE_TYPE', true);
                echo json_encode($result);
                exit();
            }
            
            $id = md5(microtime());
            $fileName = $id . '.' . $uploadedFileExtension;

            if (!JFolder::exists(JSNES_UPLOAD_IMAGES_PATH . $sliderPath))
            {
                JFolder::create(JSNES_UPLOAD_IMAGES_PATH . $sliderPath);
            }
            //always use constants when making file paths, to avoid the possibilty of remote file inclusion
            $uploadPath = JSNES_UPLOAD_IMAGES_PATH . $sliderPath . $fileName;
            $url 		= JSNES_UPLOAD_IMAGES_URL . $sliderPath . $fileName;

            if (!JFile::upload($fileTemp, $uploadPath))
            {
                $result['status'] = 'error';
                $result['error'] = JText::_('JSN_EASYSLIDER_COULD_NOT_UPLOAD', true);
                echo json_encode($result);
                exit();
            }
            else
            {
                $result['status'] = 'success';
                $result['message'] = JText::_('JSN_EASYSLIDER_UPLOAD_IMAGE_SUCCESS', true);
                $result['image'] = array();
                $result['image']['url'] = $url;
                $result['image']['id'] = $id;
                $result['image']['type'] = 'upload';

                echo json_encode($result);
                exit();
            }
        }
        exit();
    }

    /**
     * delete files on folder com_easyslider
     * @param $images array path to image
     */
    public function delete($images = array())
    {
        $path = JPath::clean(JPATH_ROOT);
        foreach ($images as $image)
        {
            if (preg_match('#(/images.*)#', $image, $matches))
            {	
                $imagePath = $matches[1];
            }
            else
            {
                $imagePath = $image;
            }
            
            if (JFile::exists($path . $imagePath))
            {
                JFile::delete($path . $imagePath);
            }

        }
    }

    public function deleteUnsavedImages()
    {
        $post = $this->_input->getArray($_POST);

        if (isset($post['deleteImages']) && !empty($post['deleteImages']))
        {
            echo $this->delete($post['deleteImages']);
        }
        exit();

    }

    /**
     * update an existed slider
     * @return JSON string
     */
    public function updateSliderData()
    {
        $post = $this->_input->getArray($_POST);

        $post['slider_data'] = $this->_input->get('slider_data', '{}', 'RAW');

        $model = $this->getModel("slider");
        echo $model->updateSliderData($post);
        if (isset($post['deleteImages']) && !empty($post['deleteImages']))
        {
            echo $this->delete($post['deleteImages']);
        }
        exit();
    }


    /**
     * create a new slider
     * @return JSON string
     */
    public function createNewSlider()
    {
        $post = $this->_input->getArray($_POST);
        $post['slider_data'] = $this->_input->get('slider_data', '{}', 'RAW');
        $post['access'] = 1;
        $post['published'] = 1;

        $models = $this->getModel("sliders");
        $post['first'] = $models->getCountSliders() == 0 ? true : false;

        $model = $this->getModel("slider");
        echo $model->createNewSlider($post);

        if (isset($post['deleteImages']) && !empty($post['deleteImages']))
        {
            echo $this->delete($post['deleteImages']);
        }
        exit();
    }


    /**
     * @param video url (youtube, vimeo)
     * @return ratio video width / height
     */
    public function getVideoRatio()
    {
        $post = $this->_input->getArray($_POST);

        $model = $this->getModel("slider");

        if ( isset( $post['video_url'] ) ) {
            if ( preg_match('/youtube/is', $post['video_url']) ) {
                echo $model->getYoutubeRatio($post['video_url']);
            }
            if ( preg_match('/vimeo/is', $post['video_url']) ) {
                echo $model->getVimeoRatio($post['video_url']);
            }

        }

        exit();
    }

/*
    public function writeFile()
    {
        $post = $this->_input->getArray($_POST);
        $data = isset($post['data']) ? $post['data'] : 'pham van khang';
        $filename = isset($post['filename']) ? $post['filename'] : 'khang.txt';

        if (!JFolder::exists(JSNES_IMAGES_PATH . '/fonts'))
        {
            JFolder::create(JSNES_IMAGES_PATH . '/fonts');
        }
        $fullPath = JSNES_IMAGES_PATH . '/fonts/' . $filename;
        JFile::write($fullPath, $data);
        exit();
    }
*/
}
